/**
 * Transport layer for the MediConnect BD backend.
 * Holds the access token in memory only, attaches Bearer headers, and provides the single-flight
 * refresh guard for both initial session restoration and concurrent 401 token expiry retries.
 */

import type { AuthResponse, CancellationOutcome } from "../shared/types";
import { ApiRequestError } from "../shared/utils/apiError";
import { apiUnavailable, parseResponse } from "./httpResponse";

export { ApiRequestError, type ApiError } from "../shared/utils/apiError";

const API_BASE = (import.meta.env.VITE_API_BASE?.trim() || "/api/v1").replace(/\/+$/, "");

let accessToken: string | null = null;
let refreshInFlight: Promise<AuthResponse> | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function rawFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const timeout = AbortSignal.timeout(75_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  try {
    return await fetch(`${API_BASE}${path}`, { ...options, headers, signal, credentials: "include" });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw apiUnavailable();
  }
}

/**
 * Single-flight refresh guard: shares one POST /auth/refresh request across concurrent callers
 * (React StrictMode double-mount or simultaneous 401 responses) so single-use refresh tokens are
 * never replayed.
 */
export function refreshSession(): Promise<AuthResponse> {
  refreshInFlight ??= (async () => {
    const response = await rawFetch("/auth/refresh", { method: "POST" });
    const result = await parseResponse<AuthResponse>(response);
    setAccessToken(result.accessToken);
    return result;
  })().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

function isAuthEndpoint(path: string): boolean {
  return (
    path === "/auth/login" ||
    path === "/auth/refresh" ||
    path === "/auth/logout" ||
    path.startsWith("/auth/patient/register") ||
    path.startsWith("/auth/doctor/register")
  );
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await rawFetch(path, options);

  if (response.status === 401 && !isAuthEndpoint(path)) {
    try {
      await refreshSession();
    } catch (error) {
      if (!(error instanceof ApiRequestError) || error.status !== 401) throw error;
      setAccessToken(null);
      return parseResponse<T>(response);
    }
    return parseResponse<T>(await rawFetch(path, options));
  }

  return parseResponse<T>(response);
}

export async function downloadBlob(path: string): Promise<Blob> {
  let response = await rawFetch(path, { method: "GET" });
  if (response.status === 401 && !isAuthEndpoint(path)) {
    await refreshSession();
    response = await rawFetch(path, { method: "GET" });
  }
  if (!response.ok) await parseResponse<never>(response);
  return response.blob();
}

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: "GET", headers }),
  post: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    }),
  put: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    }),
  patch: <T>(path: string, body?: unknown, headers?: Record<string, string>) =>
    request<T>(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      headers,
    }),
  delete: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { method: "DELETE", headers }),
  cancelAppointment: (appointmentId: string, reason: string) =>
    request<CancellationOutcome>(`/appointments/${appointmentId}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
