import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { NotificationStatus } from '../notifications.enums.js';

@Entity('notifications')
@Index('IDX_notifications_user_created', ['userId', 'createdAt'])
@Index('IDX_notifications_unread', ['userId'], { where: '"read_at" IS NULL' })
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: Relation<User>;

  @Column({ type: 'varchar', length: 60 })
  type: string;

  @Column({ type: 'varchar', length: 200 })
  subject: string;

  @Column({ type: 'text', default: '' })
  body: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  link: string | null;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    enumName: 'notification_status',
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
