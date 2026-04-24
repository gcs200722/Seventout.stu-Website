import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProductVariantEntity } from '../../products/product-variant.entity';

@Entity({ name: 'cart_items' })
export class CartItemEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cart_id', type: 'uuid' })
  cartId: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({ name: 'product_variant_id', type: 'uuid' })
  productVariantId: string;

  @ManyToOne(() => ProductVariantEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_variant_id' })
  productVariant: ProductVariantEntity;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'int' })
  price: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
