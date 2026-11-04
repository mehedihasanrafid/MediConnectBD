import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Router, type RequestHandler } from "express";
import sharp from "sharp";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../src/app";
import type { DoctorService } from "../src/modules/doctors/doctor.service";
import { createDoctorPhotoRouter } from "../src/modules/doctors/photos/doctor-photo.routes";
import { DoctorPhotoStore } from "../src/modules/doctors/photos/doctor-photo.store";
import { MAX_PHOTO_BYTES, normalizeDoctorPhoto } from "../src/modules/doctors/photos/doctor-photo.image";
import { updateDoctorProfileSchema } from "../src/modules/doctors/doctor.schema";

const directories: string[] = [];
afterEach(async () => { await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true }))); });
async function fixture(role = "DOCTOR", status = "APPROVED") {
  const directory = await mkdtemp(path.join(tmpdir(), "mediconnect-photo-test-")); directories.push(directory);
  const store = new DoctorPhotoStore(directory);
  const doctorService = { getMyProfile: vi.fn().mockResolvedValue({ id: "synthetic-doctor", applicationStatus: status }) };
  const authenticate: RequestHandler = (_req, res, next) => {
    res.locals.authUser = { id: "synthetic-user", roles: [role] }; next();
  };
  const router = Router();
  router.use("/doctors", createDoctorPhotoRouter({ authenticate, photoStore: store, doctorService: doctorService as unknown as DoctorService }));
  const app = createApp({ appUrl: "http://localhost:5173", logLevel: "silent", apiRouter: router,
    readiness: { database: async () => undefined, redis: async () => undefined } });
  const png = await sharp({ create: { width: 800, height: 600, channels: 3, background: "#20a0b0" } }).png().toBuffer();
  return { app, store, doctorService, input: { mimeType: "image/png", contentBase64: png.toString("base64") } };
}
describe("Doctor profile photos", () => {
  it("uploads a normalized photo and serves only image content without changing the profile", async () => {
    const f = await fixture();
    const upload = await request(f.app).post("/api/v1/doctors/me/photo").send(f.input);
    expect(upload.status).toBe(201);
    expect(updateDoctorProfileSchema.safeParse(upload.body).success).toBe(true);
    expect(f.doctorService.getMyProfile).toHaveBeenCalledWith("synthetic-user");
    const download = await request(f.app).get(upload.body.photoUrl);
    expect(download.status).toBe(200);
    expect(download.headers["content-type"]).toMatch(/^image\/webp/);
    expect(download.headers["x-content-type-options"]).toBe("nosniff");
    expect(download.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    expect(await sharp(download.body).metadata()).toMatchObject({ format: "webp", width: 512, height: 512 });
  });
  it("blocks other roles and pending applications before storing content", async () => {
    for (const [role, status, expected] of [["PATIENT", "APPROVED", 403], ["DOCTOR", "PENDING_REVIEW", 409]] as const) {
      const f = await fixture(role, status);
      expect((await request(f.app).post("/api/v1/doctors/me/photo").send(f.input)).status).toBe(expected);
    }
  });
  it("rejects active content, forged MIME types, malformed base64 and caller-supplied ownership", async () => {
    const f = await fixture();
    for (const input of [
      { mimeType: "image/svg+xml", contentBase64: Buffer.from("<svg/>").toString("base64") },
      { ...f.input, mimeType: "image/jpeg" }, { ...f.input, contentBase64: "%%%%" }, { ...f.input, userId: "someone-else" },
    ]) expect((await request(f.app).post("/api/v1/doctors/me/photo").send(input)).status).toBe(422);
  });
  it("limits decoded bytes and dimensions, and strips image metadata", async () => {
    await expect(normalizeDoctorPhoto("image/png", Buffer.alloc(MAX_PHOTO_BYTES + 1).toString("base64"))).rejects.toMatchObject({ statusCode: 413 });
    const huge = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "#ffffff" } }).png().toBuffer();
    await expect(normalizeDoctorPhoto("image/png", huge.toString("base64"))).rejects.toMatchObject({ statusCode: 422 });
    const source = await sharp({ create: { width: 16, height: 16, channels: 3, background: "#ffffff" } }).withMetadata({ orientation: 6 }).png().toBuffer();
    const result = await normalizeDoctorPhoto("image/png", source.toString("base64"));
    const metadata = await sharp(result).metadata();
    expect(metadata.exif).toBeUndefined(); expect(metadata.icc).toBeUndefined();
  });
  it("prevents file traversal and returns a safe error for missing assets", async () => {
    const f = await fixture();
    await expect(f.store.read("../secrets")).rejects.toMatchObject({ statusCode: 404 });
    const missing = await request(f.app).get("/api/v1/doctors/photos/00000000-0000-4000-8000-000000000001");
    expect(missing.status).toBe(404); expect(missing.body).toEqual({ code: "PHOTO_NOT_FOUND", message: "Photo was not found" });
  });
});
