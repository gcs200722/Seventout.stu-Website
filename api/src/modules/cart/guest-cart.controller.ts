import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { GuestSessionGuard } from './guards/guest-session.guard';
import { GuestSessionCookieInterceptor } from './interceptors/guest-session-cookie.interceptor';

@ApiTags('guest-cart')
@Controller('guest/cart')
@UseGuards(GuestSessionGuard)
@UseInterceptors(GuestSessionCookieInterceptor)
export class GuestCartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({
    summary: 'Get guest cart (session cookie or x-guest-session-id)',
  })
  async getCurrentCart(
    @Req() req: Request & { guestSessionId: string },
  ): Promise<{ success: true; data: unknown }> {
    const data = await this.cartService.getCurrentCartGuest(req.guestSessionId);
    return { success: true, data };
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to guest cart' })
  async addItem(
    @Req() req: Request & { guestSessionId: string },
    @Body() payload: AddCartItemDto,
  ): Promise<{ success: true; message: string }> {
    await this.cartService.addItemGuest(req.guestSessionId, payload);
    return { success: true, message: 'Cart item added successfully' };
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Update guest cart item' })
  async updateItem(
    @Req() req: Request & { guestSessionId: string },
    @Param('itemId', ParseUUIDPipe) itemId: string,
    @Body() payload: UpdateCartItemDto,
  ): Promise<{ success: true; message: string }> {
    await this.cartService.updateItemGuest(req.guestSessionId, itemId, payload);
    return { success: true, message: 'Cart item updated successfully' };
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Remove guest cart item' })
  async deleteItem(
    @Req() req: Request & { guestSessionId: string },
    @Param('itemId', ParseUUIDPipe) itemId: string,
  ): Promise<{ success: true; message: string }> {
    await this.cartService.removeItemGuest(req.guestSessionId, itemId);
    return { success: true, message: 'Cart item deleted successfully' };
  }

  @Delete('clear')
  @ApiOperation({ summary: 'Clear guest cart' })
  async clear(
    @Req() req: Request & { guestSessionId: string },
  ): Promise<{ success: true; message: string }> {
    await this.cartService.clearCartGuest(req.guestSessionId);
    return { success: true, message: 'Cart cleared successfully' };
  }

  @Post('validate')
  @ApiOperation({ summary: 'Validate guest cart' })
  async validate(
    @Req() req: Request & { guestSessionId: string },
  ): Promise<{ success: true; data: unknown }> {
    const data = await this.cartService.validateCartGuest(req.guestSessionId);
    return { success: true, data };
  }
}
