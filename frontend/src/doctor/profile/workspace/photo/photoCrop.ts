import type { PhotoDraft } from "../profileDraft";

export async function readPhoto(file: File): Promise<HTMLImageElement> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw Error("Choose a JPG, PNG or WebP photo.");
  if (file.size > 2 * 1024 * 1024) throw Error("Photo must be 2 MB or smaller.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 20_000_000) throw Error("Choose a photo smaller than 20 megapixels.");
    return image;
  } catch (error) {
    throw Error(error instanceof Error && error.message.includes("megapixels") ? error.message : "Photo could not be opened. Try another image.");
  } finally { URL.revokeObjectURL(url); }
}
export function drawPhoto(canvas: HTMLCanvasElement, image: HTMLImageElement, zoom: number, x: number, y: number) {
  const size = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
  const context = canvas.getContext("2d");
  if (!context) throw Error("Photo editing is unavailable in this browser.");
  canvas.width = 512; canvas.height = 512;
  context.clearRect(0, 0, 512, 512);
  context.drawImage(image, (image.naturalWidth - size) * x / 100, (image.naturalHeight - size) * y / 100, size, size, 0, 0, 512, 512);
}
export function cropPhoto(image: HTMLImageElement, zoom: number, x: number, y: number): PhotoDraft {
  const canvas = document.createElement("canvas");
  drawPhoto(canvas, image, zoom, x, y);
  const preview = canvas.toDataURL("image/webp", 0.9);
  const mimeType = preview.startsWith("data:image/webp;") ? "image/webp" : "image/png";
  return { preview, mimeType, contentBase64: preview.split(",")[1] };
}
