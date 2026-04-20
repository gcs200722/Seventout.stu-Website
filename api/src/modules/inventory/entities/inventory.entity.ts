import {
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { InventoryChannel } from '../inventory.types';

@Entity({ name: 'inventories' })
export class InventoryEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ type: 'varchar', length: 20 })
  channel: InventoryChannel;

  @Column({ name: 'available_stock', type: 'int', default: 0 })
  availableStock: number;

  @Column({ name: 'reserved_stock', type: 'int', default: 0 })
  reservedStock: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
