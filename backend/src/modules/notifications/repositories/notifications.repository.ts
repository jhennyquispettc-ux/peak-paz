import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, IsNull, Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { UserRole, UserStatus } from '../../users/users.enums.js';
import { Notification } from '../entities/notification.entity.js';
import { NotificationStatus } from '../notifications.enums.js';

@Injectable()
export class NotificationsRepository {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  create(
    data: Partial<Notification>,
    manager: EntityManager,
  ): Promise<Notification> {
    const repository = manager.getRepository(Notification);
    return repository.save(repository.create(data));
  }

  findRecipient(userId: string, manager: EntityManager): Promise<User | null> {
    return manager.getRepository(User).findOne({ where: { id: userId } });
  }

  findActiveAdmins(manager: EntityManager): Promise<User[]> {
    return manager.getRepository(User).find({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
    });
  }

  findWithUser(id: string): Promise<Notification | null> {
    return this.notifications.findOne({
      where: { id },
      relations: { user: true },
    });
  }

  async markSent(id: string, sentAt: Date): Promise<void> {
    await this.notifications.update(
      { id },
      { status: NotificationStatus.SENT, sentAt, lastError: null },
    );
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.notifications.update(
      { id },
      { status: NotificationStatus.FAILED, lastError: error.slice(0, 1000) },
    );
  }

  findPage(
    userId: string,
    skip: number,
    take: number,
    unreadOnly: boolean,
  ): Promise<[Notification[], number]> {
    return this.notifications.findAndCount({
      where: unreadOnly ? { userId, readAt: IsNull() } : { userId },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  countUnread(userId: string): Promise<number> {
    return this.notifications.count({ where: { userId, readAt: IsNull() } });
  }

  async markRead(userId: string, id: string, readAt: Date): Promise<boolean> {
    const result = await this.notifications.update(
      { id, userId, readAt: IsNull() },
      { readAt },
    );
    if ((result.affected ?? 0) > 0) return true;
    return this.notifications.exists({ where: { id, userId } });
  }

  async markAllRead(userId: string, readAt: Date): Promise<number> {
    const result = await this.notifications.update(
      { userId, readAt: IsNull() },
      { readAt },
    );
    return result.affected ?? 0;
  }
}
