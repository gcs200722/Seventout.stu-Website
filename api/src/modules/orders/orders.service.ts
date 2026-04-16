import { Injectable } from '@nestjs/common';
import { InventoryService } from '../inventory/inventory.service';

@Injectable()
export class OrdersService {
  constructor(private readonly inventoryService: InventoryService) {}

  async reserveStock(productId: string, quantity: number): Promise<void> {
    await this.inventoryService.reserveFromOrder(
      productId,
      quantity,
      'Order created: reserve stock',
    );
  }

  async releaseStock(productId: string, quantity: number): Promise<void> {
    await this.inventoryService.releaseFromOrder(
      productId,
      quantity,
      'Order canceled: release stock',
    );
  }

  async completeStockOut(productId: string, quantity: number): Promise<void> {
    await this.inventoryService.commitOutFromOrder(
      productId,
      quantity,
      'Order completed: commit stock out',
    );
  }
}
