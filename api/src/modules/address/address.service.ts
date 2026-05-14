import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Not, Repository } from 'typeorm';
import type { AuthenticatedUser } from '../auth/auth.types';
import { UserRole } from '../authorization/authorization.types';
import { OrderEntity } from '../orders/entities/order.entity';
import { OrderStatus } from '../orders/orders.types';
import { CreateAddressDto } from './dto/create-address.dto';
import { ListAddressesQueryDto } from './dto/list-addresses.query.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { AddressEntity } from './entities/address.entity';

type AddressPayload = Partial<{
  fullName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
  country: string;
}>;

@Injectable()
export class AddressService {
  constructor(
    @InjectRepository(AddressEntity)
    private readonly addressesRepository: Repository<AddressEntity>,
    @InjectRepository(OrderEntity)
    private readonly ordersRepository: Repository<OrderEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async createAddress(user: AuthenticatedUser, payload: CreateAddressDto) {
    const address = await this.dataSource.transaction(async (manager) => {
      const addressesRepo = manager.getRepository(AddressEntity);
      if (payload.is_default === true) {
        await addressesRepo.update(
          { userId: user.id, isDefault: true },
          { isDefault: false },
        );
      }

      return await addressesRepo.save(
        addressesRepo.create({
          userId: user.id,
          ...this.toEntityPayload(payload),
          ward: payload.ward ?? '',
          district: payload.district ?? '',
          isDefault: payload.is_default ?? false,
        }),
      );
    });

    return this.toResponse(address);
  }

  async listAddresses(user: AuthenticatedUser, query: ListAddressesQueryDto) {
    const userId = this.resolveListUserId(user, query.user_id);
    const addresses = await this.addressesRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
    return addresses.map((address) => this.toResponse(address));
  }

  async getAddressById(user: AuthenticatedUser, id: string) {
    const address = await this.findAddressById(id);
    this.ensureReadAccess(user, address);
    return this.toResponse(address);
  }

  async updateAddress(
    user: AuthenticatedUser,
    id: string,
    payload: UpdateAddressDto,
  ): Promise<void> {
    const address = await this.findAddressById(id);
    this.ensureWriteAccess(user, address);
    const mappedPayload = this.toEntityPayload(payload);

    await this.dataSource.transaction(async (manager) => {
      const addressesRepo = manager.getRepository(AddressEntity);
      if (payload.is_default === true) {
        await addressesRepo.update(
          { userId: address.userId, isDefault: true, id: Not(address.id) },
          { isDefault: false },
        );
      }
      Object.assign(address, mappedPayload);
      if (payload.is_default !== undefined) {
        address.isDefault = payload.is_default;
      }
      await addressesRepo.save(address);
    });
  }

  async setDefaultAddress(user: AuthenticatedUser, id: string): Promise<void> {
    const address = await this.findAddressById(id);
    this.ensureWriteAccess(user, address);

    await this.dataSource.transaction(async (manager) => {
      const addressesRepo = manager.getRepository(AddressEntity);
      await addressesRepo.update(
        { userId: address.userId, isDefault: true, id: Not(address.id) },
        { isDefault: false },
      );
      address.isDefault = true;
      await addressesRepo.save(address);
    });
  }

  async deleteAddress(user: AuthenticatedUser, id: string): Promise<void> {
    const address = await this.findAddressById(id);
    this.ensureWriteAccess(user, address);

    const hasActiveOrders = await this.ordersRepository.exist({
      where: {
        addressId: address.id,
        status: In([
          OrderStatus.PENDING,
          OrderStatus.CONFIRMED,
          OrderStatus.PROCESSING,
          OrderStatus.SHIPPED,
        ]),
      },
    });
    if (hasActiveOrders) {
      throw new BadRequestException({
        message: 'Address is being used by active orders',
        details: { code: 'ADDRESS_IN_USE' },
      });
    }

    await this.addressesRepository.softDelete(address.id);
  }

  private resolveListUserId(
    user: AuthenticatedUser,
    inputUserId?: string,
  ): string {
    if (user.role === UserRole.USER) {
      return user.id;
    }
    if (!inputUserId) {
      throw new BadRequestException({
        message: 'user_id is required for this role',
        details: { code: 'USER_ID_REQUIRED' },
      });
    }
    return inputUserId;
  }

  private async findAddressById(id: string): Promise<AddressEntity> {
    const address = await this.addressesRepository.findOne({ where: { id } });
    if (!address) {
      throw new NotFoundException({
        message: 'Address not found',
        details: { code: 'ADDRESS_NOT_FOUND' },
      });
    }
    return address;
  }

  private ensureReadAccess(
    user: AuthenticatedUser,
    address: AddressEntity,
  ): void {
    if (user.role === UserRole.USER && address.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You cannot access this address',
        details: { code: 'ADDRESS_FORBIDDEN' },
      });
    }
  }

  private ensureWriteAccess(
    user: AuthenticatedUser,
    address: AddressEntity,
  ): void {
    if (user.role === UserRole.STAFF) {
      throw new ForbiddenException({
        message: 'Your role is not allowed to update address',
        details: { code: 'ADDRESS_FORBIDDEN' },
      });
    }
    if (user.role === UserRole.USER && address.userId !== user.id) {
      throw new ForbiddenException({
        message: 'You cannot update this address',
        details: { code: 'ADDRESS_FORBIDDEN' },
      });
    }
  }

  private toEntityPayload(payload: Partial<CreateAddressDto>): AddressPayload {
    const mapped: AddressPayload = {};
    if (payload.full_name !== undefined) {
      mapped.fullName = payload.full_name;
    }
    if (payload.phone !== undefined) {
      mapped.phone = payload.phone;
    }
    if (payload.address_line !== undefined) {
      mapped.addressLine = payload.address_line;
    }
    if (payload.ward !== undefined) {
      mapped.ward = payload.ward;
    }
    if (payload.district !== undefined) {
      mapped.district = payload.district;
    }
    if (payload.city !== undefined) {
      mapped.city = payload.city;
    }
    if (payload.country !== undefined) {
      mapped.country = payload.country;
    }
    return mapped;
  }

  private toResponse(address: AddressEntity) {
    return {
      id: address.id,
      user_id: address.userId,
      full_name: address.fullName,
      phone: address.phone,
      address_line: address.addressLine,
      ward: address.ward,
      district: address.district,
      city: address.city,
      country: address.country,
      is_default: address.isDefault,
      created_at: address.createdAt,
      updated_at: address.updatedAt,
    };
  }
}
