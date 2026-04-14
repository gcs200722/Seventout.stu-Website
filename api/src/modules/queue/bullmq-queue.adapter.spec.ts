import { BullMqQueueAdapter } from './bullmq-queue.adapter';

describe('BullMqQueueAdapter', () => {
  it('enqueues a job to bullmq queue', async () => {
    const add = jest.fn().mockResolvedValue(undefined);
    const queue = { add };

    const adapter = new BullMqQueueAdapter(queue as never);
    const payload = { userId: 1 };

    await adapter.enqueue('send-email', payload);

    expect(add).toHaveBeenCalledWith('send-email', payload);
  });
});
