import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { AUDIT_JOB_PERSIST, AUDIT_QUEUE_NAME } from './audit.constants';
import type { AuditLogEnqueuePayload } from './audit-payload.types';
import { AuditLogEntity } from './entities/audit-log.entity';

@Processor(AUDIT_QUEUE_NAME)
export class AuditLogProcessor extends WorkerHost {
  constructor(
    @InjectRepository(AuditLogEntity)
    private readonly auditLogsRepository: Repository<AuditLogEntity>,
  ) {
    super();
  }

  async process(job: Job<AuditLogEnqueuePayload>): Promise<void> {
    if (job.name !== AUDIT_JOB_PERSIST) {
      return;
    }
    const data = job.data;
    await this.auditLogsRepository.save(
      this.auditLogsRepository.create({
        tenantId: data.tenant_id,
        actorId: data.actor_id,
        actorRole: data.actor_role,
        action: data.action,
        entityType: data.entity_type,
        entityId: data.entity_id,
        metadata: data.metadata ?? null,
        before: data.before ?? null,
        after: data.after ?? null,
      }),
    );
  }
}
