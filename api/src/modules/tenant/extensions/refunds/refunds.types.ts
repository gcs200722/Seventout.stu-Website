export enum RefundStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum RefundMethod {
  BANK_TRANSFER_MANUAL = 'BANK_TRANSFER_MANUAL',
  VNPAY = 'VNPAY',
  STRIPE = 'STRIPE',
}

export type RefundStatusTransitionMap = Record<RefundStatus, RefundStatus[]>;

export const REFUND_STATUS_FLOW: RefundStatusTransitionMap = {
  [RefundStatus.PENDING]: [RefundStatus.PROCESSING],
  [RefundStatus.PROCESSING]: [RefundStatus.SUCCESS, RefundStatus.FAILED],
  [RefundStatus.SUCCESS]: [],
  [RefundStatus.FAILED]: [],
};
