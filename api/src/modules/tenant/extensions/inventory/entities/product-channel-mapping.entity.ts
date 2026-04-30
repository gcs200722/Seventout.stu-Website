import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductVariantEntity } from '../../products/product-variant.entity';
import { InventoryChannel } from '../inventory.types';

@Entity({ name: 'product_channel_mappings' })
export class ProductChannelMappingEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => ProductVariantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariantEntity;

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
