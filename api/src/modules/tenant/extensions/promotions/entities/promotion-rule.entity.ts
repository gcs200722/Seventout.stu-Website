import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type {
  PromotionRuleActionJson,
  PromotionRuleConditionJson,
} from '../promotions.types';
import { PromotionCampaignEntity } from './promotion-campaign.entity';

@Entity({ name: 'promotion_rules' })
export class PromotionRuleEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId: string;

  @ManyToOne(() => PromotionCampaignEntity, (c) => c.rules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'campaign_id' })
  campaign: PromotionCampaignEntity;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  condition: PromotionRuleConditionJson;

  @Column({ type: 'jsonb', default: () => "'{}'" })
  action: PromotionRuleActionJson;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;
}
