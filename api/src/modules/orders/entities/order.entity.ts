import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FulfillmentStatus, OrderStatus, PaymentStatus } from '../orders.types';
import type { ShippingAddressSnapshot } from '../orders.types';

@Entity({ name: 'orders' })
export class OrderEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({
    name: 'customer_email',
    type: 'varchar',
    length: 320,
    nullable: true,
  })
  customerEmail: string | null;

  @Column({ name: 'order_number', type: 'varchar', length: 40 })
  orderNumber: string;

  @Column({
    name: 'guest_lookup_secret_hash',
    type: 'varchar',
    length: 128,
    nullable: true,
  })
  guestLookupSecretHash: string | null;

  @Column({ name: 'address_id', type: 'uuid', nullable: true })
  addressId: string | null;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'payment_status', type: 'varchar', length: 20 })
  paymentStatus: PaymentStatus;

  @Column({ name: 'fulfillment_status', type: 'varchar', length: 20 })
  fulfillmentStatus: FulfillmentStatus;

  @Column({ name: 'total_amount', type: 'int', default: 0 })
  totalAmount: number;

  @Column({ name: 'discount_total', type: 'int', default: 0 })
  discountTotal: number;

  @Column({ name: 'pricing_snapshot', type: 'jsonb', default: () => "'{}'" })
  pricingSnapshot: Record<string, unknown>;

  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress: ShippingAddressSnapshot;

  @Column({ type: 'text', default: '' })
  note: string;

  @Column({
    name: 'idempotency_key',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  idempotencyKey: string | null;

  @Column({ name: 'canceled_at', type: 'timestamptz', nullable: true })
  canceledAt: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
