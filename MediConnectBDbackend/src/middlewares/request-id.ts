/**
 * Echoes a bounded caller correlation ID, or creates one for request tracing. This identifier is
 * for diagnostics only; it is neither proof of identity nor an idempotency key.
 */

import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestId(request: Request, response: Response, next: NextFunction): void {
  const suppliedId = request.header("x-request-id");
  const id = suppliedId && suppliedId.length <= 128 ? suppliedId : randomUUID();
  response.setHeader("x-request-id", id);
  next();
}
