import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import { AppError } from "../../../utils/app-error";
import { validatePhotoId, type DoctorPhotoStorage } from "./doctor-photo.store";

/** Stores the existing normalized, public WebP images on the same durable database as profiles. */
export class MysqlDoctorPhotoStore implements DoctorPhotoStorage {
  constructor(private readonly database: DataSource) {}

  async save(image: Buffer): Promise<string> {
    const id = randomUUID();
    await this.database.query("INSERT INTO doctor_photo_assets (id, image) VALUES (?, ?)", [id, image]);
    return `/api/v1/doctors/photos/${id}`;
  }

  async read(id: string): Promise<Buffer> {
    validatePhotoId(id);
    const rows: { image: Buffer }[] = await this.database.query(
      "SELECT image FROM doctor_photo_assets WHERE id = ?",
      [id.toLowerCase()],
    );
    const image = rows[0]?.image;
    if (!image) throw new AppError(404, "PHOTO_NOT_FOUND", "Photo was not found");
    return image;
  }
}
