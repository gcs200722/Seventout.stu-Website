export const ORDER_INVENTORY_PORT = Symbol('ORDER_INVENTORY_PORT');

export interface OrderInventoryPort {
  reserveStock(
    productId: string,
    quantity: number,
    reason: string,
  ): Promise<void>;
  releaseStock(
    productId: string,
    quantity: number,
    reason: string,
  ): Promise<void>;
  commitStockOut(
    productId: string,
    quantity: number,
    reason: string,
  ): Promise<void>;
}
