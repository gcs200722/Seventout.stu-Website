import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { In, Repository } from 'typeorm';
import { PermissionEntity } from '../authorization/entities/permission.entity';
import type { AuthenticatedUser } from '../auth/auth.types';
import { AuditAction, AuditEntityType } from '../audit/audit.constants';
import { AuditWriterService } from '../audit/audit-writer.service';
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
    private readonly auditWriter: AuditWriterService,
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

  async updateUser(
    id: string,
    payload: UpdateUserDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const shouldAudit =
      actor.role === UserRole.ADMIN || actor.role === UserRole.STAFF;
    const before = shouldAudit
      ? {
          first_name: user.firstName,
          last_name: user.lastName,
          phone: user.phone,
        }
      : null;

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

    if (shouldAudit && before) {
      const after = {
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
      };
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await this.auditWriter.log({
          action: AuditAction.UPDATE,
          entityType: AuditEntityType.USER,
          entityId: id,
          actor,
          entityLabel: this.userAuditLabel(user),
          metadata: { source: 'http' },
          before,
          after,
        });
      }
    }
  }

  async softDeleteUser(id: string, actor: AuthenticatedUser): Promise<void> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const before = {
      first_name: user.firstName,
      last_name: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };

    await this.usersRepository.softDelete(id);

    await this.auditWriter.log({
      action: AuditAction.DELETE,
      entityType: AuditEntityType.USER,
      entityId: id,
      actor,
      entityLabel: this.userAuditLabel(user),
      metadata: { source: 'http' },
      before,
      after: null,
    });
  }

  async updateUserRole(
    id: string,
    payload: UpdateUserRoleDto,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const permissionCodesSorted = (codes: string[]) => [...codes].sort();
    const beforeSnap = {
      role: user.role,
      permissions: permissionCodesSorted(
        user.permissions?.map((p) => p.code) ?? [],
      ),
    };

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

    const afterSnap = {
      role: user.role,
      permissions: permissionCodesSorted(
        user.permissions?.map((p) => p.code) ?? [],
      ),
    };

    if (JSON.stringify(beforeSnap) !== JSON.stringify(afterSnap)) {
      const action =
        beforeSnap.role !== afterSnap.role
          ? AuditAction.ROLE_ASSIGN
          : AuditAction.PERMISSION_CHANGE;
      await this.auditWriter.log({
        action,
        entityType: AuditEntityType.USER,
        entityId: id,
        actor,
        entityLabel: this.userAuditLabel(user),
        metadata: { source: 'http' },
        before: beforeSnap,
        after: afterSnap,
      });
    }
  }

  private userAuditLabel(user: UserEntity): string {
    const name = `${user.firstName} ${user.lastName}`.trim();
    return name.length > 0 ? `${name} · ${user.email}` : user.email;
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
