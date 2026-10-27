/**
 * Sliding-window rate limiter middleware for sensitive public endpoints (authentication and
 * prescription verification). Returns 429 TOO_MANY_REQUESTS with a Retry-After header when the
 * caller exceeds maxRequests within windowMs.
 */

import type { RequestHandler } from "express";
import { AppError } from "../utils/app-error";

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  const buckets = new Map<string, { count: number; resetAt: number }>();
  const prefix = options.keyPrefix ?? "rl";

  return (request, response, next) => {
    const now = Date.now();
    const clientIp =
      request.ip ||
      (typeof request.headers["x-forwarded-for"] === "string"
        ? request.headers["x-forwarded-for"].split(",")[0]?.trim()
        : undefined) ||
      "local";
    const key = `${prefix}:${clientIp}`;

    const current = buckets.get(key);
    if (!current || current.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    current.count += 1;
    if (current.count > options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
      response.setHeader("Retry-After", String(retryAfterSeconds));
      next(
        new AppError(
          429,
          "TOO_MANY_REQUESTS",
          "Too many requests; please wait and try again shortly",
        ),
      );
      return;
    }

    next();
  };
}
