export const ORDER_INVENTORY_PORT = Symbol('ORDER_INVENTORY_PORT');

export interface OrderInventoryPort {
  reserveStock(
    productVariantId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void>;
  releaseStock(
    productVariantId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void>;
  commitStockOut(
    productVariantId: string,
    quantity: number,
    reason: string,
    orderId?: string,
  ): Promise<void>;
}
