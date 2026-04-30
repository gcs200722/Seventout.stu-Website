export enum CouponType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
  SHIPPING = 'SHIPPING',
}

export enum PromotionCampaignType {
  AUTO = 'AUTO',
  CODE_BASED = 'CODE_BASED',
}

export enum DiscountType {
  PERCENT = 'PERCENT',
  FIXED = 'FIXED',
}

export type PromotionRuleConditionJson = {
  category_ids?: string[];
  product_ids?: string[];
  min_quantity?: number;
  min_order_value?: number;
};

export type PromotionRuleActionJson = {
  discount_type: DiscountType;
  value: number;
  max_discount?: number | null;
};

export type PricingLineInput = {
  product_id: string;
  category_id: string;
  price: number;
  quantity: number;
  subtotal: number;
  /** Optional label for shopper-facing discount breakdown (cart / orders). */
  product_name?: string;
};
