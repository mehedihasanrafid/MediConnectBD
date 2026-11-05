/**
 * Converts expected application and Zod errors into the existing HTTP contract. Unexpected
 * failures return a generic response; internal diagnostics remain server-side. Never include
 * credentials or medical content in error details.
 */

import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../utils/app-error";

/**
 * Preserve the public error contract while keeping app.ts focused on wiring.
 */
export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }
  if (error instanceof ZodError) {
    response.status(422).json({
      code: "VALIDATION_FAILED",
      message: "The request data is invalid",
      fieldErrors: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
    });
    return;
  }
  response.status(500).json({ code: "INTERNAL_SERVER_ERROR", message: "An unexpected error occurred" });
  if (process.env.NODE_ENV === "production") {
    process.stderr.write("Unhandled API error. Check the request status and dependency health.\n");
  } else if (process.env.NODE_ENV !== "test") {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  }
};
