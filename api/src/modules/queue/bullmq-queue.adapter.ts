import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DEFAULT_QUEUE_NAME } from './queue.constants';
import { QueueJobOptions, QueueJobPayload, QueuePort } from './queue.port';

@Injectable()
export class BullMqQueueAdapter implements QueuePort {
  constructor(@InjectQueue(DEFAULT_QUEUE_NAME) private readonly queue: Queue) {}

  async enqueue(
    jobName: string,
    payload: QueueJobPayload,
    options?: QueueJobOptions,
  ): Promise<void> {
    await this.queue.add(jobName, payload, {
      attempts: options?.attempts ?? 1,
      delay:
        options?.delayMs && options.delayMs > 0 ? options.delayMs : undefined,
      backoff:
        options?.backoffMs && options.backoffMs > 0
          ? {
              type: 'exponential',
              delay: options.backoffMs,
            }
          : undefined,
      removeOnComplete: true,
    });
  }
}
