import { Inject, Injectable } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types';
import {
  AuditActionCode,
  AuditActorRole,
  AuditEntityTypeCode,
} from './audit.constants';
import { userRoleToAuditActorRole } from './audit-actor.util';
import type { AuditMetadata } from './audit-payload.types';
import {
  AUDIT_PUBLISHER_PORT,
  type AuditPublisherPort,
} from './audit.publisher.port';
import { getAuditHttpSnapshot } from './audit-request-context';

export type AuditWriterLogInput = {
  action: AuditActionCode;
  entityType: AuditEntityTypeCode;
  entityId: string | null;
  /** Null means SYSTEM actor (webhooks, jobs, internal stock). */
  actor: AuthenticatedUser | null;
  /**
   * Human-readable subject for admin UI (product name, user email, order hint…).
   * Stored as metadata.entity_label.
   */
  entityLabel?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  metadata?: AuditMetadata | null;
};

/**
 * Single entry point for enqueueing audit rows: normalizes metadata,
 * maps actor → SYSTEM when absent, delegates to BullMQ publisher.
 */
@Injectable()
export class AuditWriterService {
  constructor(
    @Inject(AUDIT_PUBLISHER_PORT)
    private readonly publisher: AuditPublisherPort,
  ) {}

  async log(input: AuditWriterLogInput): Promise<void> {
    const source =
      input.metadata &&
      typeof input.metadata === 'object' &&
      typeof input.metadata['source'] === 'string'
        ? input.metadata['source']
        : input.actor
          ? 'http'
          : 'system';

    const metadata: AuditMetadata = {
      ...(input.metadata ?? {}),
      logged_at: new Date().toISOString(),
      source,
    };

    const http = getAuditHttpSnapshot();
    if (http) {
      if (metadata['ip'] == null || metadata['ip'] === '') {
        metadata['ip'] = http.clientIp;
      }
      if (metadata['user_agent'] == null || metadata['user_agent'] === '') {
        metadata['user_agent'] = http.userAgent;
      }
      if (metadata['http_method'] == null || metadata['http_method'] === '') {
        metadata['http_method'] = http.httpMethod;
      }
      if (metadata['http_path'] == null || metadata['http_path'] === '') {
        metadata['http_path'] = http.httpPath;
      }
    }

    if (input.actor?.email) {
      metadata['actor_email'] = input.actor.email;
    }

    if (input.entityLabel != null && String(input.entityLabel).trim() !== '') {
      metadata['entity_label'] = String(input.entityLabel).trim();
    }

    await this.publisher.publish({
      tenant_id:
        (metadata['tenant_id'] as string | undefined) ??
        (metadata['tenantId'] as string | undefined) ??
        '',
      actor_id: input.actor?.id ?? null,
      actor_role: input.actor
        ? userRoleToAuditActorRole(input.actor.role)
        : AuditActorRole.SYSTEM,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId,
      metadata,
      before: input.before ?? null,
      after: input.after ?? null,
    });
  }
}
