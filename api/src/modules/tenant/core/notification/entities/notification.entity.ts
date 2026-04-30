import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { NotificationChannel, NotificationType } from '../notification.types';

@Entity({ name: 'notifications' })
@Index('idx_notifications_user_id_created_at', ['userId', 'createdAt'])
@Index('idx_notifications_is_read_created_at', ['isRead', 'createdAt'])
@Index(
  'uq_notifications_dedupe',
  ['eventSource', 'eventId', 'channel', 'userId', 'type'],
  { unique: true },
)
export class NotificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({
    name: 'recipient_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  recipientEmail: string | null;

  @Column({ type: 'varchar', length: 64 })
  type: NotificationType;

  @Column({ type: 'varchar', length: 160 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'varchar', length: 16 })
  channel: NotificationChannel;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  metadata: Record<string, unknown>;

  @Column({ name: 'event_source', type: 'varchar', length: 64 })
  eventSource: string;

  @Column({ name: 'event_id', type: 'varchar', length: 120 })
  eventId: string;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
