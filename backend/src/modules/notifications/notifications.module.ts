import { Global, Module } from '@nestjs/common';
import { FileMailTransport, MailModule, SmtpTransport } from '@nestjs/mail';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppConfig } from '../../config/app.config.js';
import { NotificationsController } from './controllers/notifications.controller.js';
import { Notification } from './entities/notification.entity.js';
import { NotificationsRepository } from './repositories/notifications.repository.js';
import { NotificationEmailSender } from './services/notification-email.sender.js';
import { NotificationsService } from './services/notifications.service.js';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    MailModule.forRootAsync({
      inject: [AppConfig],
      useFactory: (config: AppConfig) => ({
        from: config.mail.from,
        transport:
          config.mail.transport === 'file'
            ? new FileMailTransport({ directory: config.mail.directory })
            : new SmtpTransport({
                url: config.mail.smtpUrl,
                startTls: config.isProduction ? 'required' : 'opportunistic',
              }),
      }),
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsRepository,
    NotificationsService,
    NotificationEmailSender,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
