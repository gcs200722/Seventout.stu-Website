import { PartialType } from '@nestjs/swagger';
import { CreatePromotionRuleDto } from './create-promotion-rule.dto';

export class UpdatePromotionRuleDto extends PartialType(
  CreatePromotionRuleDto,
) {}
