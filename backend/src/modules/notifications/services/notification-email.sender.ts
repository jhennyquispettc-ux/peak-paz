import { Injectable } from '@nestjs/common';
import { html, Mailer } from '@nestjs/mail';
import { OnOutboxMessage, type OutboxHandlerContext } from '@nestjs/outbox';
import { AppConfig } from '../../../config/app.config.js';
import { NotificationStatus } from '../notifications.enums.js';
import { NotificationsRepository } from '../repositories/notifications.repository.js';
import { NOTIFICATION_EMAIL_TOPIC } from './notifications.service.js';

@Injectable()
export class NotificationEmailSender {
  constructor(
    private readonly notifications: NotificationsRepository,
    private readonly mailer: Mailer,
    private readonly config: AppConfig,
  ) {}

  @OnOutboxMessage(NOTIFICATION_EMAIL_TOPIC, {
    consumer: 'notification-email-sender',
  })
  async deliver(
    payload: { notificationId: string },
    context: OutboxHandlerContext,
  ): Promise<void> {
    const notification = await this.notifications.findWithUser(
      payload.notificationId,
    );
    if (!notification || notification.status === NotificationStatus.SENT) {
      return;
    }
    const user = notification.user;
    const link = notification.link
      ? new URL(notification.link, this.config.mail.publicWebUrl).toString()
      : null;
    try {
      await this.mailer.send({
        to: { address: user.email, name: user.firstName },
        subject: notification.subject,
        html: link
          ? html`<p>Hola, ${user.firstName}.</p>
              <p>${notification.body}</p>
              <p><a href="${link}">Ver en Peak Paz</a></p>`
          : html`<p>Hola, ${user.firstName}.</p>
              <p>${notification.body}</p>`,
        idempotencyKey: context.message.id,
        signal: context.signal,
        retry: false,
      });
    } catch (error) {
      await this.notifications.markFailed(
        notification.id,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
    await this.notifications.markSent(notification.id, new Date());
  }
}
