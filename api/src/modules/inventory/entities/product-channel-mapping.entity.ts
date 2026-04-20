import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryChannel } from '../inventory.types';

@Entity({ name: 'product_channel_mappings' })
export class ProductChannelMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'varchar', length: 20 })
  channel: InventoryChannel;

  @Column({ name: 'external_product_id', type: 'varchar', length: 100 })
  externalProductId: string;

  @Column({ name: 'external_sku_id', type: 'varchar', length: 100 })
  externalSkuId: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
