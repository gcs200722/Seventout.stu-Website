export enum ReturnStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  RECEIVED = 'RECEIVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export type ReturnStatusTransitionMap = Record<ReturnStatus, ReturnStatus[]>;

export const RETURN_STATUS_FLOW: ReturnStatusTransitionMap = {
  [ReturnStatus.REQUESTED]: [
    ReturnStatus.APPROVED,
    ReturnStatus.REJECTED,
    ReturnStatus.CANCELLED,
  ],
  [ReturnStatus.APPROVED]: [ReturnStatus.RECEIVED, ReturnStatus.CANCELLED],
  [ReturnStatus.RECEIVED]: [ReturnStatus.COMPLETED],
  [ReturnStatus.COMPLETED]: [],
  [ReturnStatus.REJECTED]: [],
  [ReturnStatus.CANCELLED]: [],
};
