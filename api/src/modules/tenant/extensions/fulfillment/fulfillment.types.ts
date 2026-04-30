export enum FulfillmentShippingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PACKING = 'PACKING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED_DELIVERY = 'FAILED_DELIVERY',
}

export type FulfillmentStatusTransitionMap = Record<
  FulfillmentShippingStatus,
  FulfillmentShippingStatus[]
>;

export const FULFILLMENT_STATUS_FLOW: FulfillmentStatusTransitionMap = {
  [FulfillmentShippingStatus.PENDING]: [
    FulfillmentShippingStatus.CONFIRMED,
    FulfillmentShippingStatus.CANCELLED,
  ],
  [FulfillmentShippingStatus.CONFIRMED]: [
    FulfillmentShippingStatus.PACKING,
    FulfillmentShippingStatus.CANCELLED,
  ],
  [FulfillmentShippingStatus.PACKING]: [
    FulfillmentShippingStatus.SHIPPED,
    FulfillmentShippingStatus.FAILED_DELIVERY,
  ],
  [FulfillmentShippingStatus.SHIPPED]: [
    FulfillmentShippingStatus.DELIVERED,
    FulfillmentShippingStatus.FAILED_DELIVERY,
  ],
  [FulfillmentShippingStatus.DELIVERED]: [],
  [FulfillmentShippingStatus.CANCELLED]: [],
  [FulfillmentShippingStatus.FAILED_DELIVERY]: [],
};
