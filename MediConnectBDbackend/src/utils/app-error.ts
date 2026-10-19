/**
 * Operational error safe for the global HTTP handler to serialize. Use stable codes for clients
 * and tests; details must contain only deliberately public fields, such as a payment ID for
 * reconciliation.
 */

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}
