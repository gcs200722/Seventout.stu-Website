import type {
  AuditActionCode,
  AuditActorRoleCode,
  AuditEntityTypeCode,
} from './audit.constants';

export type AuditMetadata = Record<string, unknown>;

export interface AuditLogEnqueuePayload {
  actor_id: string | null;
  actor_role: AuditActorRoleCode;
  action: AuditActionCode;
  entity_type: AuditEntityTypeCode;
  entity_id: string | null;
  metadata?: AuditMetadata | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}
