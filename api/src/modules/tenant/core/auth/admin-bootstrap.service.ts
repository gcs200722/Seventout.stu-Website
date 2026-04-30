import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { UserRole } from '../authorization/authorization.types';
import { PermissionEntity } from '../authorization/entities/permission.entity';
import { UserEntity } from '../users/user.entity';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(AdminBootstrapService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    @InjectRepository(PermissionEntity)
    private readonly permissionsRepository: Repository<PermissionEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    const existingAdmin = await this.usersRepository.findOne({
      where: { role: UserRole.ADMIN },
    });
    if (existingAdmin) {
      return;
    }

    const email = this.configService
      .getOrThrow<string>('DEFAULT_ADMIN_EMAIL')
      .trim()
      .toLowerCase();
    const password = this.configService.getOrThrow<string>(
      'DEFAULT_ADMIN_PASSWORD',
    );
    const firstName = this.configService
      .get<string>('DEFAULT_ADMIN_FIRST_NAME', 'System')
      .trim();
    const lastName = this.configService
      .get<string>('DEFAULT_ADMIN_LAST_NAME', 'Admin')
      .trim();
    const phone = this.configService
      .get<string>('DEFAULT_ADMIN_PHONE', '0000000000')
      .trim();

    const existingEmailUser = await this.usersRepository.findOne({
      where: { email },
    });
    if (existingEmailUser) {
      existingEmailUser.role = UserRole.ADMIN;
      existingEmailUser.permissions = await this.getDefaultPlatformPermissions();
      await this.usersRepository.save(existingEmailUser);
      this.logger.warn(
        `No ADMIN account found, promoted existing user ${email} to ADMIN`,
      );
      return;
    }

    const saltRounds = this.configService.getOrThrow<number>(
      'PASSWORD_SALT_ROUNDS',
    );
    const passwordHash = await bcrypt.hash(password, saltRounds);
    const adminUser = this.usersRepository.create({
      firstName,
      lastName,
      email,
      passwordHash,
      phone,
      role: UserRole.ADMIN,
      permissions: await this.getDefaultPlatformPermissions(),
    });
    await this.usersRepository.save(adminUser);
    this.logger.warn(
      `No ADMIN account found, created default ADMIN account ${email}. Change password immediately.`,
    );
  }

  private async getDefaultPlatformPermissions(): Promise<PermissionEntity[]> {
    return this.permissionsRepository.find({
      where: {
        code: In(['PLATFORM_TENANT_READ', 'PLATFORM_TENANT_MANAGE']),
      },
    });
  }
}
