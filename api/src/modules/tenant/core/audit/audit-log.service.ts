import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';
import { AuditLogEntity } from './entities/audit-log.entity';

export type AuditLogListItem = {
  id: string;
  actor_id: string | null;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: Date;
};

export type AuditLogDetail = AuditLogListItem & {
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogsRepository: Repository<AuditLogEntity>,
  ) {}

  async list(query: ListAuditLogsQueryDto): Promise<{
    items: AuditLogListItem[];
    total: number;
  }> {
    const qb = this.auditLogsRepository
      .createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC');

    if (query.actor_id) {
      qb.andWhere('a.actor_id = :actorId', { actorId: query.actor_id });
    }
    if (query.action) {
      qb.andWhere('a.action = :action', { action: query.action });
    }
    if (query.entity_type) {
      qb.andWhere('a.entity_type = :entityType', {
        entityType: query.entity_type,
      });
    }
    if (query.entity_id) {
      qb.andWhere('a.entity_id = :entityId', { entityId: query.entity_id });
    }
    if (query.date_from) {
      qb.andWhere('a.created_at >= :dateFrom', { dateFrom: query.date_from });
    }
    if (query.date_to) {
      qb.andWhere('a.created_at <= :dateTo', { dateTo: query.date_to });
    }

    const skip = (query.page - 1) * query.limit;
    qb.skip(skip).take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    const items = rows.map((row) => this.toListItem(row));
    return { items, total };
  }

  async getById(id: string): Promise<AuditLogDetail> {
    const row = await this.auditLogsRepository.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Audit log not found');
    }
    return { ...this.toListItem(row), before: row.before, after: row.after };
  }

  private toListItem(row: AuditLogEntity): AuditLogListItem {
    return {
      id: row.id,
      actor_id: row.actorId,
      actor_role: row.actorRole,
      action: row.action,
      entity_type: row.entityType,
      entity_id: row.entityId,
      metadata: row.metadata,
      created_at: row.createdAt,
    };
  }
}
