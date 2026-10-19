/**
 * Handles unmatched URLs after every feature router. Keep its response consistent with
 * resource-not-found errors so clients can handle missing routes predictably.
 */

import type { RequestHandler } from "express";

export const notFound: RequestHandler = (_request, response) => {
  response.status(404).json({ code: "NOT_FOUND", message: "The requested resource was not found" });
};
