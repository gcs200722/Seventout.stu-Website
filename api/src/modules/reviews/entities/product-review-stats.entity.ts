import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

export type RatingDistribution = {
  '1': number;
  '2': number;
  '3': number;
  '4': number;
  '5': number;
};

@Entity({ name: 'product_review_stats' })
export class ProductReviewStatsEntity {
  @PrimaryColumn({ name: 'product_id', type: 'uuid' })
  productId: string;

  @Column({
    name: 'average_rating',
    type: 'numeric',
    precision: 3,
    scale: 2,
    default: 0,
  })
  averageRating: string;

  @Column({ name: 'total_reviews', type: 'int', default: 0 })
  totalReviews: number;

  @Column({
    name: 'rating_distribution',
    type: 'jsonb',
    default: () => `'{"1":0,"2":0,"3":0,"4":0,"5":0}'`,
  })
  ratingDistribution: RatingDistribution;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
