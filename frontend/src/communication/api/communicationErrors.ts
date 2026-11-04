import { ApiRequestError } from "../../api/client";

export function communicationError(error: unknown): string {
  if (isCommunicationExpiry(error)) return "This communication window has expired. History remains read-only.";
  if (error instanceof ApiRequestError) {
    switch (error.status) {
      case 401: return "Your session has expired. Sign in again to view messages.";
      case 403: return "You are not authorized to access this conversation.";
      case 404: return "This conversation is unavailable or no longer accessible.";
      case 410: return "This communication window has expired.";
      case 409: return "Messaging is currently unavailable for this appointment. Refresh its status.";
      case 429: return "Too many requests. Wait a moment before trying again.";
      case 422: case 400: return "The message could not be accepted. Check its length and try again.";
      case 503: return "Messaging is temporarily unavailable. Please try again later.";
    }
  }
  return "Could not reach the messaging service. Please try again.";
}

export function communicationClosed(error: unknown): boolean {
  return error instanceof ApiRequestError && [401, 403, 404, 409, 410].includes(error.status);
}

export function isCommunicationExpiry(error: unknown): boolean {
  return error instanceof ApiRequestError && error.code === "COMMUNICATION_WINDOW_EXPIRED";
}
