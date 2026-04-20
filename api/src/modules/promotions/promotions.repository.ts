import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { CouponEntity } from './entities/coupon.entity';
import { CouponUsageEntity } from './entities/coupon-usage.entity';
import { PromotionCampaignEntity } from './entities/promotion-campaign.entity';
import { PromotionRuleEntity } from './entities/promotion-rule.entity';
import { PromotionCampaignType } from './promotions.types';

@Injectable()
export class PromotionsRepository {
  constructor(
    @InjectRepository(CouponEntity)
    private readonly couponsRepository: Repository<CouponEntity>,
    @InjectRepository(CouponUsageEntity)
    private readonly couponUsagesRepository: Repository<CouponUsageEntity>,
    @InjectRepository(PromotionCampaignEntity)
    private readonly campaignsRepository: Repository<PromotionCampaignEntity>,
    @InjectRepository(PromotionRuleEntity)
    private readonly rulesRepository: Repository<PromotionRuleEntity>,
  ) {}

  async findCouponByNormalizedCode(
    normalizedCode: string,
  ): Promise<CouponEntity | null> {
    return this.couponsRepository
      .createQueryBuilder('c')
      .where('lower(c.code) = lower(:code)', { code: normalizedCode })
      .andWhere('c.deleted_at IS NULL')
      .getOne();
  }

  async lockCouponById(
    manager: EntityManager,
    couponId: string,
  ): Promise<CouponEntity | null> {
    return manager
      .createQueryBuilder(CouponEntity, 'c')
      .setLock('pessimistic_write')
      .where('c.id = :id', { id: couponId })
      .andWhere('c.deleted_at IS NULL')
      .getOne();
  }

  async countUsagesForUser(
    manager: EntityManager | undefined,
    couponId: string,
    userId: string,
  ): Promise<number> {
    const repo = manager
      ? manager.getRepository(CouponUsageEntity)
      : this.couponUsagesRepository;
    return repo.count({
      where: { couponId, userId },
    });
  }

  async incrementCouponUsedCount(
    manager: EntityManager,
    couponId: string,
  ): Promise<void> {
    await manager.increment(CouponEntity, { id: couponId }, 'usedCount', 1);
  }

  async saveCouponUsage(
    manager: EntityManager,
    row: Pick<
      CouponUsageEntity,
      'couponId' | 'userId' | 'orderId' | 'discountAmount'
    >,
  ): Promise<void> {
    await manager.save(manager.getRepository(CouponUsageEntity).create(row));
  }

  async findActiveAutoCampaignsWithRules(): Promise<PromotionCampaignEntity[]> {
    return this.campaignsRepository.find({
      where: {
        type: PromotionCampaignType.AUTO,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: ['rules'],
      order: { priority: 'DESC', id: 'ASC' },
    });
  }

  async listCouponsAdmin(): Promise<CouponEntity[]> {
    return this.couponsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async saveCoupon(entity: CouponEntity): Promise<CouponEntity> {
    return this.couponsRepository.save(entity);
  }

  async findCouponById(id: string): Promise<CouponEntity | null> {
    return this.couponsRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async softDeleteCoupon(id: string): Promise<void> {
    await this.couponsRepository.softDelete({ id });
  }

  async listCampaignsAdmin(): Promise<PromotionCampaignEntity[]> {
    return this.campaignsRepository.find({
      relations: ['rules'],
      order: { priority: 'DESC', createdAt: 'DESC' },
    });
  }

  async saveCampaign(
    entity: PromotionCampaignEntity,
  ): Promise<PromotionCampaignEntity> {
    return this.campaignsRepository.save(entity);
  }

  async findCampaignById(id: string): Promise<PromotionCampaignEntity | null> {
    return this.campaignsRepository.findOne({
      where: { id, deletedAt: IsNull() },
      relations: ['rules'],
    });
  }

  async softDeleteCampaign(id: string): Promise<void> {
    await this.campaignsRepository.softDelete({ id });
  }

  async saveRule(entity: PromotionRuleEntity): Promise<PromotionRuleEntity> {
    return this.rulesRepository.save(entity);
  }

  async findRuleById(id: string): Promise<PromotionRuleEntity | null> {
    return this.rulesRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
  }

  async softDeleteRule(id: string): Promise<void> {
    await this.rulesRepository.softDelete({ id });
  }
}
