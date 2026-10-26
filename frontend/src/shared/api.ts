/**
 * Re-exports the transport client and error types from `src/api/client.ts` for backward compatibility.
 */

export {
  api,
  ApiRequestError,
  getAccessToken,
  refreshSession,
  request,
  setAccessToken,
  type ApiError,
} from "../api/client";
