/**
 * Routes for in-app notifications (`/api/v1/notifications`).
 * Supports listing user notifications, automatic mark-read on popover open,
 * and individual mark-read on click.
 */

import { Router, type RequestHandler, type Request, type Response, type NextFunction } from "express";
import type { AuthenticatedLocals } from "../auth/auth.middleware";
import type { InAppNotificationService } from "./in-app-notification.service";

export function createInAppNotificationRouter(
  service: InAppNotificationService,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  /**
   * GET /api/v1/notifications
   * Returns in-app notifications and unreadCount for the authenticated user.
   */
  router.get("/", authenticate, async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (res.locals as AuthenticatedLocals).authUser;
      const result = await service.listUserNotifications(authUser.id, authUser.roles[0]);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * POST /api/v1/notifications/mark-read
   * Automatically triggered when the header notification popover opens.
   * Clears the unread count badge to none.
   */
  router.post("/mark-read", authenticate, async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const authUser = (res.locals as AuthenticatedLocals).authUser;
      const result = await service.markAllAsRead(authUser.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /api/v1/notifications/:id/read
   * Marks a specific notification as read.
   */
  router.patch("/:id/read", authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = String(req.params.id);
      const authUser = (res.locals as AuthenticatedLocals).authUser;
      const result = await service.markAsRead(id, authUser.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
