import sharp from "sharp";
import { AppError } from "../../../utils/app-error";

export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };

/** Decode untrusted input, limit work, and re-encode without metadata or active content. */
export async function normalizeDoctorPhoto(mimeType: string, contentBase64: string): Promise<Buffer> {
  if (!formats[mimeType] || !/^[A-Za-z0-9+/]+={0,2}$/.test(contentBase64) || contentBase64.length % 4 !== 0) {
    throw new AppError(422, "INVALID_PHOTO", "Choose a valid JPG, PNG or WebP photo");
  }
  const input = Buffer.from(contentBase64, "base64");
  if (input.length > MAX_PHOTO_BYTES) throw new AppError(413, "PHOTO_TOO_LARGE", "Photo must be 2 MB or smaller");
  try {
    const image = sharp(input, { limitInputPixels: 20_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (metadata.format !== formats[mimeType] || (metadata.pages ?? 1) !== 1) throw Error("Unsupported image");
    return await image.rotate().resize(512, 512, { fit: "cover" }).webp({ quality: 85 }).toBuffer();
  } catch {
    throw new AppError(422, "INVALID_PHOTO", "Photo could not be decoded. Choose a non-animated JPG, PNG or WebP");
  }
}
