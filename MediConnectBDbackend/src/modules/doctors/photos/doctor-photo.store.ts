import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { AppError } from "../../../utils/app-error";

export interface DoctorPhotoStorage {
  save(image: Buffer): Promise<string>;
  read(id: string): Promise<Buffer>;
}

export function validatePhotoId(id: string): void {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new AppError(404, "PHOTO_NOT_FOUND", "Photo was not found");
  }
}

/** Public avatar assets only. Medical documents never use this store. */
export class DoctorPhotoStore implements DoctorPhotoStorage {
  constructor(private readonly directory = process.env.DOCTOR_PHOTO_DIRECTORY ??
    path.resolve(__dirname, "../../../../.local/doctor-photos")) {}

  async save(image: Buffer): Promise<string> {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    const id = randomUUID();
    await writeFile(path.join(this.directory, `${id}.webp`), image, { flag: "wx", mode: 0o600 });
    return `/api/v1/doctors/photos/${id}`;
  }

  async read(id: string): Promise<Buffer> {
    validatePhotoId(id);
    try { return await readFile(path.join(this.directory, `${id}.webp`)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new AppError(404, "PHOTO_NOT_FOUND", "Photo was not found");
      throw error;
    }
  }
}
