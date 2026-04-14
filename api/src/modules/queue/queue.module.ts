import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { BullMqQueueAdapter } from './bullmq-queue.adapter';
import { DEFAULT_QUEUE_NAME, QUEUE_PORT } from './queue.constants';

@Module({
  imports: [BullModule.registerQueue({ name: DEFAULT_QUEUE_NAME })],
  providers: [
    BullMqQueueAdapter,
    {
      provide: QUEUE_PORT,
      useExisting: BullMqQueueAdapter,
    },
  ],
  exports: [QUEUE_PORT],
})
export class QueueModule {}
