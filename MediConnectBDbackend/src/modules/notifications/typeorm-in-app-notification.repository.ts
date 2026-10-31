/**
 * TypeORM implementation for `in_app_notifications` repository.
 */

import type { DataSource, Repository } from "typeorm";
import { InAppNotification } from "./in-app-notification.entity";

export interface InAppNotificationRepository {
  findForUser(userId: string): Promise<InAppNotification[]>;
  countUnreadForUser(userId: string): Promise<number>;
  markAllAsRead(userId: string): Promise<number>;
  markAsRead(id: string, userId: string): Promise<boolean>;
  save(notification: Partial<InAppNotification>): Promise<InAppNotification>;
}

export class TypeOrmInAppNotificationRepository implements InAppNotificationRepository {
  private readonly repo: Repository<InAppNotification>;

  constructor(dataSource: DataSource) {
    this.repo = dataSource.getRepository(InAppNotification);
  }

  async findForUser(userId: string): Promise<InAppNotification[]> {
    return this.repo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: 50,
    });
  }

  async countUnreadForUser(userId: string): Promise<number> {
    return this.repo.count({
      where: { userId, isRead: false },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.repo
      .createQueryBuilder()
      .update(InAppNotification)
      .set({ isRead: true, readAt: new Date() })
      .where("is_read = :isRead AND user_id = :userId", {
        isRead: false,
        userId,
      })
      .execute();

    return result.affected ?? 0;
  }

  async markAsRead(id: string, userId: string): Promise<boolean> {
    const result = await this.repo
      .createQueryBuilder()
      .update(InAppNotification)
      .set({ isRead: true, readAt: new Date() })
      .where("id = :id AND user_id = :userId", {
        id,
        userId,
      })
      .execute();

    return (result.affected ?? 0) > 0;
  }

  async save(notification: Partial<InAppNotification>): Promise<InAppNotification> {
    const entity = this.repo.create(notification);
    return this.repo.save(entity);
  }
}
