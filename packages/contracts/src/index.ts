export const QUEUE_NAMES = {
  default: 'default',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];
