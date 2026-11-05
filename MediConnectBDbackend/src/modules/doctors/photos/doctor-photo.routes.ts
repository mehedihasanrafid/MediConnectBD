import { Router, type RequestHandler } from "express";
import { z } from "zod";
import { createRateLimiter } from "../../../middlewares/rate-limit";
import { AppError } from "../../../utils/app-error";
import { requireRole, type AuthenticatedLocals } from "../../auth/auth.middleware";
import type { DoctorService } from "../doctor.service";
import { MAX_PHOTO_BYTES, normalizeDoctorPhoto } from "./doctor-photo.image";
import { DoctorPhotoStore, type DoctorPhotoStorage } from "./doctor-photo.store";

const uploadSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  contentBase64: z.string().min(4).max(Math.ceil(MAX_PHOTO_BYTES / 3) * 4),
}).strict();

export function createDoctorPhotoRouter(options: {
  authenticate: RequestHandler; doctorService: DoctorService; photoStore?: DoctorPhotoStorage | undefined;
}): Router {
  const router = Router(), store = options.photoStore ?? new DoctorPhotoStore();
  router.post("/me/photo", options.authenticate, requireRole("DOCTOR"),
    createRateLimiter({ windowMs: 60_000, maxRequests: 10, keyPrefix: "doctor-photo" }),
    async (request, response) => {
      const user = (response.locals as AuthenticatedLocals).authUser;
      const profile = await options.doctorService.getMyProfile(user.id);
      if (profile.applicationStatus === "PENDING_REVIEW") {
        throw new AppError(409, "APPLICATION_UNDER_REVIEW", "Your profile is under review and cannot be changed");
      }
      const input = uploadSchema.parse(request.body);
      const image = await normalizeDoctorPhoto(input.mimeType, input.contentBase64);
      response.status(201).json({ photoUrl: await store.save(image) });
    });
  router.get("/photos/:photoId", async (request, response) => {
    const image = await store.read(String(request.params.photoId));
    response.set("Cross-Origin-Resource-Policy", "cross-origin").set("Cache-Control", "public, max-age=3600")
      .type("image/webp").send(image);
  });
  return router;
}
