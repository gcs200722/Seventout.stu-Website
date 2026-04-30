import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PromotionsApplicationService } from './promotions.application.service';

@ApiTags('promotions')
@Controller('promotions')
export class PromotionsActiveController {
  constructor(
    private readonly promotionsApplication: PromotionsApplicationService,
  ) {}

  @Get('active')
  @ApiOperation({ summary: 'List active auto promotion campaigns (public)' })
  async getActive() {
    const data = await this.promotionsApplication.getActivePromotionsPublic();
    return { success: true, data };
  }
}
