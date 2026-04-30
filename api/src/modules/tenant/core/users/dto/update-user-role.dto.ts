import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional } from 'class-validator';
import {
  PermissionCode,
  UserRole,
} from '../../authorization/authorization.types';

export class UpdateUserRoleDto {
  @ApiProperty({ enum: UserRole, example: UserRole.STAFF })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    enum: PermissionCode,
    isArray: true,
    required: false,
    example: [PermissionCode.USER_READ, PermissionCode.ORDER_MANAGE],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PermissionCode, { each: true })
  permissions?: PermissionCode[];
}
