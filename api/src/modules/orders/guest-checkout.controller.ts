import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { GuestSessionGuard } from '../cart/guards/guest-session.guard';
import { GuestSessionCookieInterceptor } from '../cart/interceptors/guest-session-cookie.interceptor';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';
import { OrdersService } from './orders.service';

const GUEST_CHECKOUT_THROTTLE_LIMIT = Number.parseInt(
  process.env.THROTTLE_GUEST_CHECKOUT_LIMIT ?? '20',
  10,
);
const GUEST_CHECKOUT_THROTTLE_TTL_MS = Number.parseInt(
  process.env.THROTTLE_GUEST_CHECKOUT_TTL_MS ?? '60000',
  10,
);

@ApiTags('guest-checkout')
@Controller('guest')
@UseGuards(GuestSessionGuard)
@UseInterceptors(GuestSessionCookieInterceptor)
export class GuestCheckoutController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @Throttle({
    default: {
      limit: Number.isFinite(GUEST_CHECKOUT_THROTTLE_LIMIT)
        ? GUEST_CHECKOUT_THROTTLE_LIMIT
        : 20,
      ttl: Number.isFinite(GUEST_CHECKOUT_THROTTLE_TTL_MS)
        ? GUEST_CHECKOUT_THROTTLE_TTL_MS
        : 60000,
    },
  })
  @ApiOperation({ summary: 'Guest checkout (COD) — creates order + payment' })
  async checkout(
    @Req() req: Request & { guestSessionId: string },
    @Body() payload: GuestCheckoutDto,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    const data = await this.ordersService.createGuestOrder(
      req.guestSessionId,
      payload,
      idempotencyKey,
    );
    return { success: true, data };
  }
}
