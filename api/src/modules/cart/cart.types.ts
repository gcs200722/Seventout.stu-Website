export enum CartIssueCode {
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  PRICE_CHANGED = 'PRICE_CHANGED',
  PRODUCT_UNAVAILABLE = 'PRODUCT_UNAVAILABLE',
}

export type CartIssue = {
  code: CartIssueCode;
  product_id: string;
  message: string;
};
