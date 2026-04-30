import { Logger } from '@nestjs/common';
import { AuditPublisher } from './audit.publisher';
import {
  AuditAction,
  AuditActorRole,
  AuditEntityType,
} from './audit.constants';

describe('AuditPublisher', () => {
  const configService = {
    get: jest.fn((key: string, defaultVal?: string) => {
      if (key === 'DEFAULT_TENANT_ID') return 'tenant-1';
      return defaultVal ?? 'default';
    }),
  };

  it('swallows_errors_when_queue_add_fails', async () => {
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    const queue = {
      add: jest.fn().mockRejectedValue(new Error('redis down')),
    };

    const publisher = new AuditPublisher(queue as never, configService as never);
    await expect(
      publisher.publish({
        actor_id: 'a1',
        actor_role: AuditActorRole.ADMIN,
        action: AuditAction.LOGIN,
        entity_type: AuditEntityType.AUTH,
        entity_id: 'a1',
        metadata: null,
        before: null,
        after: null,
      }),
    ).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('adds_job_when_queue_succeeds', async () => {
    const queue = {
      add: jest.fn().mockResolvedValue(undefined),
    };
    const publisher = new AuditPublisher(queue as never, configService as never);
    await publisher.publish({
      actor_id: null,
      actor_role: AuditActorRole.SYSTEM,
      action: AuditAction.CREATE,
      entity_type: AuditEntityType.ORDER,
      entity_id: 'o1',
      metadata: { source: 'system' },
      before: null,
      after: { status: 'PENDING' },
    });
    expect(queue.add).toHaveBeenCalled();
  });
});
