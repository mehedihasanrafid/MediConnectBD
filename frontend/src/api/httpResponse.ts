import { ApiRequestError, type ApiError } from "../shared/utils/apiError";

export function apiUnavailable(status = 503): ApiRequestError {
  return new ApiRequestError(status, "API_UNAVAILABLE", "The server may be starting. Wait a moment and try again.");
}

export async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  let data: unknown;
  try {
    const body = await response.text();
    data = body ? JSON.parse(body) : null;
  } catch {
    if (response.status >= 500) throw apiUnavailable(response.status);
    throw new ApiRequestError(response.ok ? 502 : response.status, "INVALID_API_RESPONSE", "The server returned an unexpected response. Please try again.");
  }
  if (!response.ok) {
    const error = data as ApiError | null;
    if (response.status >= 500 && !error?.code && !error?.message) throw apiUnavailable(response.status);
    throw new ApiRequestError(response.status, error?.code ?? "REQUEST_FAILED",
      error?.message ?? "The request could not be completed", error?.fieldErrors);
  }
  return data as T;
}
