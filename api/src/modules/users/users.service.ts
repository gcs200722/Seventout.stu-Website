import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { In, Repository } from 'typeorm';
import { PermissionEntity } from '../authorization/entities/permission.entity';
import { ListUsersQueryDto } from './dto/list-users.query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './user.entity';

export interface UserResponse {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
  permissions: PermissionCode[];
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionsRepository: Repository<PermissionEntity>,
  ) {}

  async listUsers(query: ListUsersQueryDto): Promise<UserResponse[]> {
    const skip = (query.page - 1) * query.limit;
    const users = await this.usersRepository.find({
      order: { createdAt: 'DESC' },
      skip,
      take: query.limit,
    });
    return users.map((user) => this.toResponse(user));
  }

  async getUserById(id: string): Promise<UserResponse> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResponse(user);
  }

  async updateUser(id: string, payload: UpdateUserDto): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (payload.first_name !== undefined) {
      user.firstName = payload.first_name;
    }
    if (payload.last_name !== undefined) {
      user.lastName = payload.last_name;
    }
    if (payload.phone !== undefined) {
      user.phone = payload.phone;
    }

    await this.usersRepository.save(user);
  }

  async softDeleteUser(id: string): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.usersRepository.softDelete(id);
  }

  async updateUserRole(id: string, payload: UpdateUserRoleDto): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = payload.role;
    if (payload.role === UserRole.STAFF) {
      const permissionCodes = Array.from(new Set(payload.permissions ?? []));
      const permissions = await this.permissionsRepository.find({
        where: { code: In(permissionCodes) },
      });
      if (permissions.length !== permissionCodes.length) {
        throw new BadRequestException('Invalid permissions');
      }
      user.permissions = permissions;
    } else {
      user.permissions = [];
    }
    await this.usersRepository.save(user);
  }

  private toResponse(user: UserEntity): UserResponse {
    return {
      id: user.id,
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      permissions:
        user.permissions?.map(
          (permission) => permission.code as PermissionCode,
        ) ?? [],
    };
  }
}
