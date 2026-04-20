export type QueueJobPayload = Record<string, any>;
export type QueueJobOptions = {
  attempts?: number;
  backoffMs?: number;
  /** BullMQ job delay before first run (scheduled / deferred work). */
  delayMs?: number;
};

export interface QueuePort {
  enqueue(
    jobName: string,
    payload: QueueJobPayload,
    options?: QueueJobOptions,
  ): Promise<void>;
}
