import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { AUDIT_JOB_PERSIST, AUDIT_QUEUE_NAME } from './audit.constants';
import type { AuditLogEnqueuePayload } from './audit-payload.types';
import type { AuditPublisherPort } from './audit.publisher.port';
import { sanitizeAuditEnqueuePayload } from './sanitize-audit-payload';

@Injectable()
export class AuditPublisher implements AuditPublisherPort {
  private readonly logger = new Logger(AuditPublisher.name);

  constructor(
    @InjectQueue(AUDIT_QUEUE_NAME) private readonly auditQueue: Queue,
  ) {}

  async publish(payload: AuditLogEnqueuePayload): Promise<void> {
    try {
      const safe = sanitizeAuditEnqueuePayload(payload);
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
}
