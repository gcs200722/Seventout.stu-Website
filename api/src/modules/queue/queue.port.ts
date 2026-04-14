export type QueueJobPayload = Record<string, any>;

export interface QueuePort {
  enqueue(jobName: string, payload: QueueJobPayload): Promise<void>;
}
