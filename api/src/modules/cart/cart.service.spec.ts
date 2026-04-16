import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, Repository, type EntityManager } from 'typeorm';
import { InventoryChannel } from '../inventory/inventory.types';
import { InventoryEntity } from '../inventory/entities/inventory.entity';
import { OrdersService } from '../orders/orders.service';
import { ProductEntity } from '../products/product.entity';
import { CartCachePort } from './cart-cache.port';
import { CartService } from './cart.service';
import { CartItemEntity } from './entities/cart-item.entity';
import { CartEntity, CartStatus } from './entities/cart.entity';

describe('CartService', () => {
  let service: CartService;
  let cartsRepository: jest.Mocked<Repository<CartEntity>>;
  let cartItemsRepository: jest.Mocked<Repository<CartItemEntity>>;
  let productsRepository: jest.Mocked<Repository<ProductEntity>>;
  let inventoriesRepository: jest.Mocked<Repository<InventoryEntity>>;
  let ordersService: jest.Mocked<OrdersService>;
  let dataSource: jest.Mocked<DataSource>;
  let cartCache: jest.Mocked<CartCachePort>;

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
    inventoriesRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as never;
    ordersService = {
      reserveStock: jest.fn(),
      releaseStock: jest.fn(),
    } as never;
    dataSource = {
      transaction: jest.fn(),
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
      inventoriesRepository,
      ordersService,
      dataSource,
      cartCache,
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
      productId: 'p-1',
      channel: InventoryChannel.INTERNAL,
      availableStock: 10,
    } as InventoryEntity);
    cartItemsRepository.findOne.mockResolvedValue(null);

    await service.addItem('u-1', { product_id: 'p-1', quantity: 2 });

    expect((cartItemsRepository.save as jest.Mock).mock.calls.length).toBe(1);
    expect((cartCache.invalidate as jest.Mock).mock.calls[0]).toEqual(['u-1']);
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
    inventoriesRepository.find.mockResolvedValue([
      { productId: 'p-1', availableStock: 9 } as InventoryEntity,
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
      productId: 'p-1',
      channel: InventoryChannel.INTERNAL,
      availableStock: 10,
    } as InventoryEntity);
    cartItemsRepository.findOne.mockResolvedValue({
      id: 'i-1',
      cartId: 'c-1',
      productId: 'p-1',
      quantity: 2,
      price: 100,
    } as CartItemEntity);

    await service.addItem('u-1', { product_id: 'p-1', quantity: 3 });
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
      productId: 'p-1',
      channel: InventoryChannel.INTERNAL,
      availableStock: 1,
    } as InventoryEntity);
    cartItemsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.addItem('u-1', { product_id: 'p-1', quantity: 2 }),
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
      quantity: 1,
      price: 100,
    } as CartItemEntity);

    await service.removeItem('u-1', 'i-1');
    expect((cartItemsRepository.delete as jest.Mock).mock.calls[0]).toEqual([
      'i-1',
    ]);
    expect((cartCache.invalidate as jest.Mock).mock.calls[0]).toEqual(['u-1']);
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
    inventoriesRepository.find.mockResolvedValue([
      {
        productId: 'p-1',
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
        quantity: 1,
        price: 100,
      } as CartItemEntity,
    ]);
    productsRepository.find.mockResolvedValue([]);
    inventoriesRepository.find.mockResolvedValue([]);

    const result = await service.validateCart('u-1');
    expect(result.valid).toBe(false);
    expect(result.issues[0]?.code).toBe('PRODUCT_UNAVAILABLE');
  });

  it('fails checkout when cart validation is invalid', async () => {
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
        quantity: 3,
        price: 100,
      } as CartItemEntity,
    ]);
    productsRepository.find.mockResolvedValue([
      {
        id: 'p-1',
        price: 100,
        isActive: true,
        deletedAt: null,
      } as ProductEntity,
    ]);
    inventoriesRepository.find.mockResolvedValue([
      { productId: 'p-1', availableStock: 1 } as InventoryEntity,
    ]);

    await expect(service.checkout('u-1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('fails checkout when cart has no items', async () => {
    cartsRepository.findOne.mockResolvedValue({
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity);
    cartItemsRepository.find.mockResolvedValue([]);

    await expect(service.checkout('u-1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('releases reserved stock when checkout fails mid-way', async () => {
    const cart = {
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity;
    cartsRepository.findOne.mockResolvedValue(cart);
    cartItemsRepository.find
      .mockResolvedValueOnce([
        { id: 'i-1', cartId: 'c-1', productId: 'p-1', quantity: 1, price: 100 },
        { id: 'i-2', cartId: 'c-1', productId: 'p-2', quantity: 1, price: 100 },
      ] as CartItemEntity[])
      .mockResolvedValueOnce([
        { id: 'i-1', cartId: 'c-1', productId: 'p-1', quantity: 1, price: 100 },
        { id: 'i-2', cartId: 'c-1', productId: 'p-2', quantity: 1, price: 100 },
      ] as CartItemEntity[]);
    productsRepository.find.mockResolvedValue([
      { id: 'p-1', price: 100, isActive: true, deletedAt: null },
      { id: 'p-2', price: 100, isActive: true, deletedAt: null },
    ] as ProductEntity[]);
    inventoriesRepository.find.mockResolvedValue([
      { productId: 'p-1', availableStock: 10 },
      { productId: 'p-2', availableStock: 10 },
    ] as InventoryEntity[]);
    ordersService.reserveStock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new BadRequestException('reserve failed'));

    await expect(service.checkout('u-1', {})).rejects.toThrow(
      BadRequestException,
    );
    expect((ordersService.releaseStock as jest.Mock).mock.calls[0]).toEqual([
      'p-1',
      1,
    ]);
  });

  it('clears cart and creates new active cart on successful checkout', async () => {
    const cart = {
      id: 'c-1',
      userId: 'u-1',
      status: CartStatus.ACTIVE,
    } as CartEntity;
    cartsRepository.findOne.mockResolvedValue(cart);
    cartItemsRepository.find
      .mockResolvedValueOnce([
        { id: 'i-1', cartId: 'c-1', productId: 'p-1', quantity: 1, price: 100 },
      ] as CartItemEntity[])
      .mockResolvedValueOnce([
        { id: 'i-1', cartId: 'c-1', productId: 'p-1', quantity: 1, price: 100 },
      ] as CartItemEntity[]);
    productsRepository.find.mockResolvedValue([
      { id: 'p-1', price: 100, isActive: true, deletedAt: null },
    ] as ProductEntity[]);
    inventoriesRepository.find.mockResolvedValue([
      { productId: 'p-1', availableStock: 5 },
    ] as InventoryEntity[]);
    (dataSource.transaction as jest.Mock).mockImplementation(
      async (cb: (manager: EntityManager) => Promise<unknown>) => {
        const manager = {
          delete: jest.fn(),
          save: jest.fn(),
        };
        return cb(manager as unknown as EntityManager);
      },
    );

    await service.checkout('u-1', { idempotency_key: 'k-1' });
    expect((dataSource.transaction as jest.Mock).mock.calls.length).toBe(1);
    expect((cartCache.invalidate as jest.Mock).mock.calls[0]).toEqual(['u-1']);
  });
});
