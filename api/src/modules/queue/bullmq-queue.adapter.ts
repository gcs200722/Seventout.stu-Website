import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { DEFAULT_QUEUE_NAME } from './queue.constants';
import { QueueJobPayload, QueuePort } from './queue.port';

@Injectable()
export class BullMqQueueAdapter implements QueuePort {
  constructor(@InjectQueue(DEFAULT_QUEUE_NAME) private readonly queue: Queue) {}

  async enqueue(jobName: string, payload: QueueJobPayload): Promise<void> {
    await this.queue.add(jobName, payload);
  }
}
