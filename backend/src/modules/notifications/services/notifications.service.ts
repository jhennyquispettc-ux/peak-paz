import { Injectable } from '@nestjs/common';
import { Outbox } from '@nestjs/outbox';
import { EntityManager } from 'typeorm';
import { PaginationMetaDto } from '../../../common/dto/pagination-meta.dto.js';
import {
  NotificationDto,
  NotificationPageDto,
  NotificationQueryDto,
} from '../dto/notification.dto.js';
import { NotificationNotFoundException } from '../exceptions/notifications.exceptions.js';
import { NotificationType } from '../notifications.enums.js';
import { NotificationsRepository } from '../repositories/notifications.repository.js';
import { NotificationData, renderNotification } from '../templates.js';

export const NOTIFICATION_EMAIL_TOPIC = 'notification.email';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notifications: NotificationsRepository,
    private readonly outbox: Outbox<EntityManager>,
  ) {}

  async notify(
    manager: EntityManager,
    userId: string | null | undefined,
    type: NotificationType,
    data: NotificationData,
  ): Promise<void> {
    if (!userId) return;
    const recipient = await this.notifications.findRecipient(userId, manager);
    if (!recipient) return;
    const rendered = renderNotification(type, recipient.language, data);
    const notification = await this.notifications.create(
      { userId, type, ...rendered },
      manager,
    );
    await this.outbox.add(manager, {
      topic: NOTIFICATION_EMAIL_TOPIC,
      key: notification.id,
      payload: { notificationId: notification.id },
    });
  }

  async notifyAdmins(
    manager: EntityManager,
    type: NotificationType,
    data: NotificationData,
  ): Promise<void> {
    for (const admin of await this.notifications.findActiveAdmins(manager)) {
      await this.notify(manager, admin.id, type, data);
    }
  }

  async listMine(
    userId: string,
    query: NotificationQueryDto,
  ): Promise<NotificationPageDto> {
    const [items, total] = await this.notifications.findPage(
      userId,
      query.skip,
      query.limit,
      query.unread ?? false,
    );
    return {
      data: items.map((item) => NotificationDto.fromEntity(item)),
      meta: PaginationMetaDto.of(query.page, query.limit, total),
      unread: await this.notifications.countUnread(userId),
    };
  }

  async markRead(userId: string, id: string): Promise<void> {
    const found = await this.notifications.markRead(userId, id, new Date());
    if (!found) throw new NotificationNotFoundException();
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    return {
      updated: await this.notifications.markAllRead(userId, new Date()),
    };
  }
}
