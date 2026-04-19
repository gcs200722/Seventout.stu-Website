import type { AuditLogEnqueuePayload } from './audit-payload.types';

export const AUDIT_PUBLISHER_PORT = Symbol('AUDIT_PUBLISHER_PORT');

export interface AuditPublisherPort {
  publish(payload: AuditLogEnqueuePayload): Promise<void>;
}
