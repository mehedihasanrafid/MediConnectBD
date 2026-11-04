/** Uploaded avatars use API paths, including when the API is hosted on another origin. */
export function apiAssetUrl(value?: string | null): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("/api/v1/doctors/photos/")) {
    const base = import.meta.env.VITE_API_BASE;
    return base && /^https?:\/\//i.test(base) ? new URL(value, base).href : value;
  }
  return /^(https?:\/\/|data:image\/(jpeg|png|webp);base64,)/i.test(value) ? value : undefined;
}
