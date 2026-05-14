import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PublicOrderLookupDto } from './dto/public-order-lookup.dto';
import { OrdersService } from './orders.service';

const ORDER_LOOKUP_THROTTLE_LIMIT = Number.parseInt(
  process.env.THROTTLE_ORDER_LOOKUP_LIMIT ?? '15',
  10,
);
const ORDER_LOOKUP_THROTTLE_TTL_MS = Number.parseInt(
  process.env.THROTTLE_ORDER_LOOKUP_TTL_MS ?? '60000',
  10,
);

@ApiTags('public-orders')
@Controller('public/orders')
export class PublicOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('lookup')
  @Throttle({
    default: {
      limit: Number.isFinite(ORDER_LOOKUP_THROTTLE_LIMIT)
        ? ORDER_LOOKUP_THROTTLE_LIMIT
        : 15,
      ttl: Number.isFinite(ORDER_LOOKUP_THROTTLE_TTL_MS)
        ? ORDER_LOOKUP_THROTTLE_TTL_MS
        : 60000,
    },
  })
  @ApiOperation({
    summary: 'Lookup guest order by order number, email, and lookup secret',
  })
  async lookup(@Body() payload: PublicOrderLookupDto) {
    const data = await this.ordersService.lookupPublicOrder(payload);
    return { success: true, data };
  }
}
