import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { InventoryChannel, InventoryMovementType } from '../inventory.types';

@Entity({ name: 'inventory_movements' })
export class InventoryMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'varchar', length: 20 })
  channel: InventoryChannel;

  @Column({ type: 'varchar', length: 20 })
  type: InventoryMovementType;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ name: 'before_stock', type: 'int' })
  beforeStock: number;

  @Column({ name: 'after_stock', type: 'int' })
  afterStock: number;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
