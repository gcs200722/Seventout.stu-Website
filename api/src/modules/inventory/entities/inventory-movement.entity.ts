import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductVariantEntity } from '../../products/product-variant.entity';
import { InventoryChannel, InventoryMovementType } from '../inventory.types';

@Entity({ name: 'inventory_movements' })
export class InventoryMovementEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId: string;

  @ManyToOne(() => ProductVariantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariantEntity;

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
