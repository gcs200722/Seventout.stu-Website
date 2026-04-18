import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({ name: 'coupon_usages' })
export class CouponUsageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'coupon_id', type: 'uuid' })
  couponId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'discount_amount', type: 'int', default: 0 })
  discountAmount: number;

  @CreateDateColumn({ name: 'used_at', type: 'timestamptz' })
  usedAt: Date;
}
