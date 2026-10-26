/**
 * Structured API error representation compatible with `erasableSyntaxOnly: true`.
 */

export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
  fieldErrors?: Array<{ path: string; message: string }>;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors?: Array<{ path: string; message: string }>;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors?: Array<{ path: string; message: string }>,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  if (error instanceof ApiRequestError) {
    if (error.fieldErrors && error.fieldErrors.length > 0) {
      return `${error.message}: ${error.fieldErrors.map((f) => `${f.path} (${f.message})`).join(", ")}`;
    }
    return error.message;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
