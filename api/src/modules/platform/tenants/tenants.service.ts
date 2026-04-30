import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity, TenantStatus } from './entities/tenant.entity';

const RESERVED_TENANT_SLUGS = new Set(['admin', 'api', 'www']);
const TENANT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
  ) {}

  async findById(id: string): Promise<TenantEntity | null> {
    return this.tenantsRepository.findOne({ where: { id } });
  }

  async listAll(): Promise<TenantEntity[]> {
    return this.tenantsRepository.find({
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async findBySlug(slug: string): Promise<TenantEntity | null> {
    const normalizedSlug = this.normalizeSlug(slug);
    return this.tenantsRepository
      .createQueryBuilder('tenant')
      .where('LOWER(tenant.slug) = :slug', { slug: normalizedSlug })
      .getOne();
  }

  async findActiveBySlug(slug: string): Promise<TenantEntity | null> {
    const normalizedSlug = this.normalizeSlug(slug);
    return this.tenantsRepository
      .createQueryBuilder('tenant')
      .where('LOWER(tenant.slug) = :slug', { slug: normalizedSlug })
      .andWhere('tenant.status = :status', { status: TenantStatus.ACTIVE })
      .getOne();
  }

  normalizeSlug(slug: string): string {
    const normalized = slug.trim().toLowerCase();
    if (!TENANT_SLUG_REGEX.test(normalized)) {
      throw new BadRequestException('Invalid tenant slug.');
    }
    if (RESERVED_TENANT_SLUGS.has(normalized)) {
      throw new BadRequestException('Tenant slug is reserved.');
    }
    return normalized;
  }

  async updateStatus(id: string, status: TenantStatus): Promise<TenantEntity | null> {
    const tenant = await this.findById(id);
    if (!tenant) {
      return null;
    }
    tenant.status = status;
    return this.tenantsRepository.save(tenant);
  }
}
