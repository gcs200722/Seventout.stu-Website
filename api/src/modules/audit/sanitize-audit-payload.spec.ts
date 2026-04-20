import {
  AuditAction,
  AuditActorRole,
  AuditEntityType,
} from './audit.constants';
import {
  sanitizeAuditObject,
  sanitizeAuditEnqueuePayload,
} from './sanitize-audit-payload';

describe('sanitizeAuditObject', () => {
  it('masks_sensitive_keys', () => {
    const input = {
      email: 'a@b.com',
      password: 'secret',
      nested: { access_token: 'tok' },
    };
    expect(sanitizeAuditObject(input)).toEqual({
      email: 'a@b.com',
      password: '***',
      nested: { access_token: '***' },
    });
  });
});

describe('sanitizeAuditEnqueuePayload', () => {
  it('sanitizes_before_after_and_metadata', () => {
    const payload = {
      actor_id: 'u1',
      actor_role: AuditActorRole.ADMIN,
      action: AuditAction.UPDATE,
      entity_type: AuditEntityType.USER,
      entity_id: 'u2',
      before: { password: 'x' },
      after: { token: 'y' },
      metadata: { refresh_token: 'z' },
    };
    const out = sanitizeAuditEnqueuePayload(payload);
    expect(out.before).toEqual({ password: '***' });
    expect(out.after).toEqual({ token: '***' });
    expect(out.metadata).toEqual({ refresh_token: '***' });
  });
});
