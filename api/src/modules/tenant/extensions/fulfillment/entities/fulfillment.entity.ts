import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FulfillmentShippingStatus } from '../fulfillment.types';

@Entity({ name: 'fulfillments' })
export class FulfillmentEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', type: 'uuid', unique: true })
  orderId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @Column({
    type: 'varchar',
    length: 32,
    default: FulfillmentShippingStatus.PENDING,
  })
  status: FulfillmentShippingStatus;

  @Column({
    name: 'tracking_code',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  trackingCode: string | null;

  @Column({
    name: 'shipping_provider',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  shippingProvider: string | null;

  @Column({ type: 'text', default: '' })
  note: string;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date | null;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
