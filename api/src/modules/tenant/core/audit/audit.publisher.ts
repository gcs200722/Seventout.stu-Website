import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { AUDIT_JOB_PERSIST, AUDIT_QUEUE_NAME } from './audit.constants';
import type { AuditLogEnqueuePayload } from './audit-payload.types';
import type { AuditPublisherPort } from './audit.publisher.port';
import { sanitizeAuditEnqueuePayload } from './sanitize-audit-payload';
import { getAuditHttpSnapshot } from './audit-request-context';

@Injectable()
export class AuditPublisher implements AuditPublisherPort {
  private readonly logger = new Logger(AuditPublisher.name);

  constructor(
    @InjectQueue(AUDIT_QUEUE_NAME) private readonly auditQueue: Queue,
    private readonly configService: ConfigService,
  ) {}

  async publish(payload: AuditLogEnqueuePayload): Promise<void> {
    try {
      const tenantId = this.resolveTenantId();
      const safe = sanitizeAuditEnqueuePayload({
        ...payload,
        tenant_id: payload.tenant_id || tenantId,
      });
      await this.auditQueue.add(AUDIT_JOB_PERSIST, safe, {
        attempts: 5,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      });
    } catch (error) {
      this.logger.warn(
        `Audit enqueue failed action=${payload.action} entity=${payload.entity_type}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  private resolveTenantId(): string {
    const requestTenantId = getAuditHttpSnapshot()?.tenantId;
    if (requestTenantId && requestTenantId.trim().length > 0) {
      return requestTenantId.trim();
    }
    const configured = this.configService.get<string>('DEFAULT_TENANT_ID');
    if (configured?.trim()) {
      return configured.trim();
    }
    return this.configService.get<string>('DEFAULT_TENANT_SLUG', 'default');
  }
}
