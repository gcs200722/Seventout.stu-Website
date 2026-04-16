import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductEntity } from './product.entity';

@Entity({ name: 'product_images' })
export class ProductImageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @ManyToOne(() => ProductEntity, (product) => product.images, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'product_id' })
  product: ProductEntity;

  @Column({ name: 'image_url', type: 'varchar', length: 500 })
  imageUrl: string;

  @Column({ name: 'is_thumbnail', type: 'boolean', default: false })
  isThumbnail: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;
}
