export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum FulfillmentStatus {
  UNFULFILLED = 'UNFULFILLED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

export enum OrderEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_CANCELED = 'ORDER_CANCELED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
}

export type ShippingAddressSnapshot = {
  full_name: string;
  phone: string;
  address_line: string;
  ward: string;
  city: string;
  country: string;
};
