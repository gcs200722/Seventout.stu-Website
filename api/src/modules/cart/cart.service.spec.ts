import { BadRequestException, NotFoundException } from '@nestjs/common';
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

describe('CartService', () => {
  let service: CartService;
  let cartsRepository: jest.Mocked<Repository<CartEntity>>;
  let cartItemsRepository: jest.Mocked<Repository<CartItemEntity>>;
  let productsRepository: jest.Mocked<Repository<ProductEntity>>;
  let variantsRepository: jest.Mocked<Repository<ProductVariantEntity>>;
  let inventoriesRepository: jest.Mocked<Repository<InventoryEntity>>;
  let cartCache: jest.Mocked<CartCachePort>;
  let dataSource: DataSource;

  beforeEach(() => {
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

  it('creates new cart item on add', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
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

    await service.addItem('u-1', {
      product_id: 'p-1',
      product_variant_id: VARIANT_ID,
      quantity: 2,
    });

    expect((cartItemsRepository.save as jest.Mock).mock.calls.length).toBe(1);
    expect((cartCache.invalidate as jest.Mock).mock.calls[0]).toEqual([
      { kind: 'user', userId: 'u-1' },
    ]);
  });

  it('returns cached cart snapshot when available', async () => {
    cartCache.get.mockResolvedValue({
      cart_id: 'c-1',
      items: [],
      total_amount: 0,
      total_items: 0,
    });

    const result = await service.getCurrentCart('u-1');
    expect(result.cart_id).toBe('c-1');
    expect((cartsRepository.findOne as jest.Mock).mock.calls.length).toBe(0);
  });

  it('builds and caches snapshot when cache miss', async () => {
    cartCache.get.mockResolvedValue(null);
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);
    cartItemsRepository.find.mockResolvedValue([
      {
        id: 'i-1',
        cartId: 'c-1',
        productId: 'p-1',
        productVariantId: VARIANT_ID,
        quantity: 2,
        price: 100,
      } as CartItemEntity,
    ]);
    productsRepository.find.mockResolvedValue([
      {
        id: 'p-1',
        name: 'Tee',
        isActive: true,
        deletedAt: null,
      } as ProductEntity,
    ]);
    variantsRepository.find.mockResolvedValue([
      {
        id: VARIANT_ID,
        productId: 'p-1',
        color: 'Đen',
        size: 'M',
      } as ProductVariantEntity,
    ]);
    inventoriesRepository.find.mockResolvedValue([
      {
        productVariantId: VARIANT_ID,
        availableStock: 9,
      } as InventoryEntity,
    ]);

    const result = await service.getCurrentCart('u-1');
    expect(result.total_items).toBe(2);
    expect(result.total_amount).toBe(200);
    expect((cartCache.set as jest.Mock).mock.calls.length).toBe(1);
  });

  it('merges quantity when adding existing cart item', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);
    productsRepository.findOne.mockResolvedValue({
      id: 'p-1',
      price: 150,
      isActive: true,
      deletedAt: null,
    } as ProductEntity);
    inventoriesRepository.findOne.mockResolvedValue({
      productVariantId: VARIANT_ID,
      channel: InventoryChannel.INTERNAL,
      availableStock: 10,
    } as InventoryEntity);
    cartItemsRepository.findOne.mockResolvedValue({
      id: 'i-1',
      cartId: 'c-1',
      productId: 'p-1',
      productVariantId: VARIANT_ID,
      quantity: 2,
      price: 100,
    } as CartItemEntity);

    await service.addItem('u-1', {
      product_id: 'p-1',
      product_variant_id: VARIANT_ID,
      quantity: 3,
    });
    const saveCalls = (cartItemsRepository.save as jest.Mock).mock
      .calls as unknown[][];
    const saved = saveCalls[0]?.[0] as CartItemEntity;
    expect(saved.quantity).toBe(5);
    expect(saved.price).toBe(150);
  });

  it('fails add when requested quantity exceeds stock', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
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
      availableStock: 1,
    } as InventoryEntity);
    cartItemsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.addItem('u-1', {
        product_id: 'p-1',
        product_variant_id: VARIANT_ID,
        quantity: 2,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('fails update when item not found', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);
    cartItemsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateItem('u-1', 'missing', { quantity: 1 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('fails update when product is unavailable', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);
    cartItemsRepository.findOne.mockResolvedValue({
      id: 'i-1',
      cartId: 'c-1',
      productId: 'p-1',
      productVariantId: VARIANT_ID,
      quantity: 1,
      price: 100,
    } as CartItemEntity);
    productsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.updateItem('u-1', 'i-1', { quantity: 2 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('removes item and invalidates cache', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);
    cartItemsRepository.findOne.mockResolvedValue({
      id: 'i-1',
      cartId: 'c-1',
      productId: 'p-1',
      productVariantId: VARIANT_ID,
      quantity: 1,
      price: 100,
    } as CartItemEntity);

    await service.removeItem('u-1', 'i-1');
    expect((cartItemsRepository.delete as jest.Mock).mock.calls[0]).toEqual([
      'i-1',
    ]);
    expect((cartCache.invalidate as jest.Mock).mock.calls[0]).toEqual([
      { kind: 'user', userId: 'u-1' },
    ]);
  });

  it('clears cart items and invalidates cache', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);

    await service.clearCart('u-1');
    expect((cartItemsRepository.delete as jest.Mock).mock.calls[0]).toEqual([
      { cartId: 'c-1' },
    ]);
  });

  it('returns validation issues for price and stock mismatch', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);
    cartItemsRepository.find.mockResolvedValue([
      {
        id: 'i-1',
        cartId: 'c-1',
        productId: 'p-1',
        productVariantId: VARIANT_ID,
        quantity: 3,
        price: 100,
      } as CartItemEntity,
    ]);
    productsRepository.find.mockResolvedValue([
      {
        id: 'p-1',
        price: 120,
        isActive: true,
        deletedAt: null,
      } as ProductEntity,
    ]);
    variantsRepository.find.mockResolvedValue([
      {
        id: VARIANT_ID,
        productId: 'p-1',
        color: 'x',
        size: 'y',
      } as ProductVariantEntity,
    ]);
    inventoriesRepository.find.mockResolvedValue([
      {
        productVariantId: VARIANT_ID,
        channel: InventoryChannel.INTERNAL,
        availableStock: 1,
      } as InventoryEntity,
    ]);

    const result = await service.validateCart('u-1');
    expect(result.valid).toBe(false);
    expect(result.issues).toHaveLength(2);
  });

  it('returns PRODUCT_UNAVAILABLE issue during validation', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);
    cartItemsRepository.find.mockResolvedValue([
      {
        id: 'i-1',
        cartId: 'c-1',
        productId: 'p-404',
        productVariantId: 'v-404',
        quantity: 1,
        price: 100,
      } as CartItemEntity,
    ]);
    productsRepository.find.mockResolvedValue([]);
    variantsRepository.find.mockResolvedValue([]);
    inventoriesRepository.find.mockResolvedValue([]);

    const result = await service.validateCart('u-1');
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe('PRODUCT_UNAVAILABLE');
  });
});
