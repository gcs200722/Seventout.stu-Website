import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, Min } from 'class-validator';
import type {
  PromotionRuleActionJson,
  PromotionRuleConditionJson,
} from '../promotions.types';

export class CreatePromotionRuleDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  condition!: PromotionRuleConditionJson;

  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  action!: PromotionRuleActionJson;

  @ApiPropertyOptional({ default: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
