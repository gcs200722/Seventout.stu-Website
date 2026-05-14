/* eslint-disable @typescript-eslint/unbound-method */
import { DataSource, EntityManager, Repository } from 'typeorm';
import { InventoryChannel } from '../inventory/inventory.types';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { ProductEntity } from '../products/product.entity';
import { ProductVariantEntity } from '../products/product-variant.entity';
import { CartCachePort } from './cart-cache.port';
import { CartService } from './cart.service';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity, CartStatus } from './entities/cart.entity';

const VARIANT_ID = 'v-1';

describe('CartService.mergeGuestCartIntoUser', () => {
  let service: CartService;
  let cartsRepository: jest.Mocked<Repository<CartEntity>>;
  let cartItemsRepository: jest.Mocked<Repository<CartItemEntity>>;
  let productsRepository: jest.Mocked<Repository<ProductEntity>>;
  let variantsRepository: jest.Mocked<Repository<ProductVariantEntity>>;
  let inventoriesRepository: jest.Mocked<Repository<InventoryEntity>>;
  let cartCache: jest.Mocked<CartCachePort>;
  let dataSource: DataSource;

  beforeEach(() => {
    cartsRepository = {
      findOne: jest.fn(),
      create: jest.fn((payload: unknown) => payload as CartEntity),
      save: jest.fn(),
    } as never;
    cartItemsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn((payload: unknown) => payload as CartItemEntity),
      save: jest.fn(),
      delete: jest.fn(),
    } as never;
    productsRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as never;
    variantsRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: VARIANT_ID,
        productId: 'p-1',
      } as ProductVariantEntity),
      find: jest.fn().mockResolvedValue([]),
    } as never;
    inventoriesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as never;
    cartCache = {
      get: jest.fn(),
      set: jest.fn(),
      invalidate: jest.fn(),
    };
    const manager = {
      getRepository: (entity: unknown) => {
        if (entity === CartEntity) return cartsRepository;
        if (entity === CartItemEntity) return cartItemsRepository;
        if (entity === ProductEntity) return productsRepository;
        if (entity === ProductVariantEntity) return variantsRepository;
        if (entity === InventoryEntity) return inventoriesRepository;
        return cartItemsRepository;
      },
    };
    dataSource = {
      transaction: jest.fn((fn: (m: EntityManager) => Promise<unknown>) =>
        fn(manager as unknown as EntityManager),
      ),
      manager: manager as never,
    } as unknown as DataSource;

    service = new CartService(
      cartsRepository,
      cartItemsRepository,
      productsRepository,
      variantsRepository,
      inventoriesRepository,
      cartCache,
      dataSource,
    );
  });

  it('moves guest lines into user cart and closes guest cart', async () => {
    cartsRepository.findOne.mockResolvedValueOnce({
      id: 'g-cart',
      userId: null,
      guestSessionId: 'sess-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);
    cartItemsRepository.find.mockResolvedValueOnce([
      {
        id: 'gi-1',
        cartId: 'g-cart',
        productId: 'p-1',
        productVariantId: VARIANT_ID,
        quantity: 2,
        price: 100,
      } as CartItemEntity,
    ]);
    cartsRepository.findOne.mockResolvedValueOnce({
      id: 'u-cart',
      userId: 'u-1',
      guestSessionId: null,
      status: CartStatus.ACTIVE,
    } as CartEntity);
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      price: 100,
      isActive: true,
      deletedAt: null,
    } as ProductEntity);
    inventoriesRepository.findOne.mockResolvedValue({
      productVariantId: VARIANT_ID,
      channel: InventoryChannel.INTERNAL,
      availableStock: 10,
    } as InventoryEntity);
    cartItemsRepository.findOne.mockResolvedValue(null);

    await service.mergeGuestCartIntoUser('u-1', 'sess-1');

    expect(dataSource.transaction).toHaveBeenCalled();
    expect(cartItemsRepository.delete).toHaveBeenCalledWith({
      cartId: 'g-cart',
    });
    expect(cartsRepository.save).toHaveBeenCalled();
    expect(cartCache.invalidate).toHaveBeenCalledWith({
      kind: 'user',
      userId: 'u-1',
    });
    expect(cartCache.invalidate).toHaveBeenCalledWith({
      kind: 'guest',
      sessionId: 'sess-1',
    });
  });
});
