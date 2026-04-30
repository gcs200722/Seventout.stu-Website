import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionCode, UserRole } from '../authorization/authorization.types';
import { RequirePermissions } from '../authorization/decorators/require-permissions.decorator';
import { RequireRoles } from '../authorization/decorators/require-roles.decorator';
import { AuthorizationGuard } from '../authorization/guards/authorization.guard';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { ListAddressesQueryDto } from './dto/list-addresses.query.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('addresses')
@Controller('addresses')
@UseGuards(JwtAuthGuard, AuthorizationGuard)
@ApiBearerAuth('access-token')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({ summary: 'Create shipping address' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ADDRESS_CREATE)
  async createAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: CreateAddressDto,
  ) {
    const data = await this.addressService.createAddress(user, payload);
    return { success: true, data };
  }

  @Get()
  @ApiOperation({ summary: 'List addresses' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ADDRESS_READ)
  async listAddresses(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAddressesQueryDto,
  ) {
    const data = await this.addressService.listAddresses(user, query);
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get address detail' })
  @RequireRoles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ADDRESS_READ)
  async getAddressById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const data = await this.addressService.getAddressById(user, id);
    return { success: true, data };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update address by id' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ADDRESS_UPDATE)
  async updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() payload: UpdateAddressDto,
  ) {
    await this.addressService.updateAddress(user, id, payload);
    return { success: true, message: 'Address updated successfully' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete address by id' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ADDRESS_DELETE)
  async deleteAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.addressService.deleteAddress(user, id);
    return { success: true, message: 'Address deleted successfully' };
  }

  @Patch(':id/set-default')
  @ApiOperation({ summary: 'Set default address' })
  @RequireRoles(UserRole.USER, UserRole.ADMIN)
  @RequirePermissions(PermissionCode.ADDRESS_UPDATE)
  async setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.addressService.setDefaultAddress(user, id);
    return { success: true, message: 'Address set as default successfully' };
  }
}
