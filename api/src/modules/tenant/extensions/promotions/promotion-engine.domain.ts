import {
  CouponType,
  DiscountType,
  type PricingLineInput,
  type PromotionRuleConditionJson,
} from './promotions.types';

/** Upper bound for simulated cart qty on PLP (min-qty / min-order heuristics). */
const CATALOG_PREVIEW_QTY_CAP = 100;
import type { PromotionCampaignEntity } from './entities/promotion-campaign.entity';
import type { PromotionRuleEntity } from './entities/promotion-rule.entity';

export type CouponDiscountQuote = {
  amount: number;
  free_shipping: boolean;
};

/** Cart / UI: thresholds + scope from the rule that produced the auto discount (when applicable). */
export type AutoPromotionConditionsDisplay = {
  min_quantity: number | null;
  min_order_value: number | null;
  /** Discount base is limited to lines whose product_id is in the campaign rule list. */
  scoped_to_products: boolean;
  /** Discount base is limited to lines whose category_id is in the campaign rule list. */
  scoped_to_categories: boolean;
};

/** Per cart line share of the winning auto discount (display / receipts). */
export type AutoPromotionLineAllocation = {
  product_id: string;
  product_name?: string;
  subtotal: number;
  discount_amount: number;
};

export type AutoPromotionQuote = {
  campaign_id: string;
  campaign_name: string;
  discount_amount: number;
  /** Present when discount is attributed to a rule carrying these thresholds. */
  conditions_display?: AutoPromotionConditionsDisplay;
  /** Split of discount_amount across eligible lines (proportional by subtotal). */
  line_allocations?: AutoPromotionLineAllocation[];
};

export type CampaignDiscountResult = {
  amount: number;
  conditions_display?: AutoPromotionConditionsDisplay;
  /** Lines whose subtotals formed the base for this campaign's discount. */
  matched_lines: PricingLineInput[];
};

/** Split total discount across lines by subtotal share (integers, last line absorbs remainder). */
export function allocateProportionalDiscount(
  totalDiscount: number,
  matchedLines: PricingLineInput[],
): AutoPromotionLineAllocation[] {
  const sumSub = matchedLines.reduce((s, l) => s + l.subtotal, 0);
  if (sumSub <= 0 || totalDiscount <= 0) {
    return [];
  }
  let allocated = 0;
  return matchedLines.map((l, i) => {
    if (i === matchedLines.length - 1) {
      return {
        product_id: l.product_id,
        product_name: l.product_name,
        subtotal: l.subtotal,
        discount_amount: totalDiscount - allocated,
      };
    }
    const part = Math.floor((totalDiscount * l.subtotal) / sumSub);
    allocated += part;
    return {
      product_id: l.product_id,
      product_name: l.product_name,
      subtotal: l.subtotal,
      discount_amount: part,
    };
  });
}

function buildConditionsDisplay(
  condition: PromotionRuleConditionJson | null,
  discountFromRule: boolean,
): AutoPromotionConditionsDisplay | undefined {
  if (!discountFromRule || !condition) {
    return undefined;
  }
  const minQ =
    condition.min_quantity != null && condition.min_quantity > 0
      ? condition.min_quantity
      : null;
  const minO =
    condition.min_order_value != null && condition.min_order_value > 0
      ? condition.min_order_value
      : null;
  const scopedToProducts = (condition.product_ids?.length ?? 0) > 0;
  const scopedToCategories = (condition.category_ids?.length ?? 0) > 0;
  if (
    minQ == null &&
    minO == null &&
    !scopedToProducts &&
    !scopedToCategories
  ) {
    return undefined;
  }
  return {
    min_quantity: minQ,
    min_order_value: minO,
    scoped_to_products: scopedToProducts,
    scoped_to_categories: scopedToCategories,
  };
}

export type PricingQuoteResult = {
  subtotal_amount: number;
  coupon_discount: number;
  coupon_free_shipping: boolean;
  auto_discount: number;
  auto_promotion: AutoPromotionQuote | null;
  discount_total: number;
  total_amount: number;
  stack_mode: 'BEST_OF' | 'ADDITIVE';
};

function applyDiscountToBase(
  discountType: DiscountType,
  value: number,
  baseSubtotal: number,
  maxDiscount?: number | null,
): number {
  if (baseSubtotal <= 0) {
    return 0;
  }
  let raw = 0;
  if (discountType === DiscountType.PERCENT) {
    raw = Math.floor((baseSubtotal * value) / 100);
  } else {
    raw = value;
  }
  if (maxDiscount != null && maxDiscount > 0) {
    raw = Math.min(raw, maxDiscount);
  }
  return Math.min(Math.max(raw, 0), baseSubtotal);
}

export function computeCouponDiscount(
  type: CouponType,
  value: number,
  cartSubtotal: number,
  minOrderValue: number,
  maxDiscount: number | null,
): CouponDiscountQuote {
  if (cartSubtotal < minOrderValue) {
    return { amount: 0, free_shipping: false };
  }
  if (type === CouponType.SHIPPING) {
    const amount = value > 0 ? Math.min(value, cartSubtotal) : 0;
    return { amount, free_shipping: true };
  }
  if (type === CouponType.PERCENT) {
    const amount = applyDiscountToBase(
      DiscountType.PERCENT,
      value,
      cartSubtotal,
      maxDiscount,
    );
    return { amount, free_shipping: false };
  }
  const amount = applyDiscountToBase(
    DiscountType.FIXED,
    value,
    cartSubtotal,
    maxDiscount,
  );
  return { amount, free_shipping: false };
}

function matchedLinesForRule(
  lines: PricingLineInput[],
  condition: PromotionRuleConditionJson,
): PricingLineInput[] {
  const pids = new Set(condition.product_ids ?? []);
  const cids = new Set(condition.category_ids ?? []);
  if (pids.size === 0 && cids.size === 0) {
    return lines;
  }
  return lines.filter(
    (l) =>
      (pids.size > 0 && pids.has(l.product_id)) ||
      (cids.size > 0 && cids.has(l.category_id)),
  );
}

/** True when any rule narrows which lines count (non-empty product or category allowlist). */
function campaignHasScopedRules(
  rules: Pick<PromotionRuleEntity, 'condition'>[],
): boolean {
  return rules.some((r) => {
    const c = r.condition;
    const p = c.product_ids?.length ?? 0;
    const cat = c.category_ids?.length ?? 0;
    return p > 0 || cat > 0;
  });
}

function ruleAppliesGlobally(
  condition: PromotionRuleConditionJson,
  lines: PricingLineInput[],
  cartSubtotal: number,
): boolean {
  const cartQty = lines.reduce((sum, l) => sum + l.quantity, 0);
  if (
    condition.min_order_value != null &&
    cartSubtotal < condition.min_order_value
  ) {
    return false;
  }
  if (condition.min_quantity != null && cartQty < condition.min_quantity) {
    return false;
  }
  return true;
}

export function computeRuleDiscount(
  rule: Pick<PromotionRuleEntity, 'condition' | 'action'>,
  lines: PricingLineInput[],
  cartSubtotal: number,
): number {
  if (!ruleAppliesGlobally(rule.condition, lines, cartSubtotal)) {
    return 0;
  }
  const matched = matchedLinesForRule(lines, rule.condition);
  const matchedSubtotal = matched.reduce((sum, l) => sum + l.subtotal, 0);
  if (matchedSubtotal <= 0) {
    return 0;
  }
  const action = rule.action;
  if (!action?.discount_type || action.value == null) {
    return 0;
  }
  return applyDiscountToBase(
    action.discount_type,
    action.value,
    matchedSubtotal,
    action.max_discount,
  );
}

export function computeCampaignDiscount(
  campaign: Pick<
    PromotionCampaignEntity,
    'id' | 'name' | 'discountType' | 'value' | 'maxDiscount'
  > & {
    rules?: Pick<
      PromotionRuleEntity,
      'condition' | 'action' | 'sortOrder' | 'deletedAt'
    >[];
  },
  lines: PricingLineInput[],
  cartSubtotal: number,
): CampaignDiscountResult {
  const activeRules = (campaign.rules ?? [])
    .filter((r) => !r.deletedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (!activeRules.length) {
    const amount = applyDiscountToBase(
      campaign.discountType,
      campaign.value,
      cartSubtotal,
      campaign.maxDiscount,
    );
    return {
      amount,
      matched_lines: lines,
    };
  }

  let best = 0;
  let bestCondition: PromotionRuleConditionJson | null = null;
  for (const rule of activeRules) {
    const d = computeRuleDiscount(rule, lines, cartSubtotal);
    if (d > best) {
      best = d;
      bestCondition = rule.condition;
    }
  }
  /**
   * Campaign-level discount on the entity is a "baseline" for unscoped campaigns.
   * If any rule uses product_ids / category_ids, that baseline must not apply to
   * lines outside those scopes (otherwise every SKU gets max(rule, baseline)).
   */
  if (campaignHasScopedRules(activeRules)) {
    const matchedLines =
      best > 0 && bestCondition
        ? matchedLinesForRule(lines, bestCondition)
        : [];
    return {
      amount: best,
      conditions_display: buildConditionsDisplay(bestCondition, best > 0),
      matched_lines: matchedLines,
    };
  }
  const baseline = applyDiscountToBase(
    campaign.discountType,
    campaign.value,
    cartSubtotal,
    campaign.maxDiscount,
  );
  const amount = Math.max(best, baseline);
  const ruleDroveDiscount = best > 0 && best >= baseline;

  let matched_lines: PricingLineInput[];
  if (amount <= 0) {
    matched_lines = [];
  } else if (baseline > best) {
    matched_lines = lines;
  } else if (best > 0 && bestCondition) {
    matched_lines = matchedLinesForRule(lines, bestCondition);
  } else {
    matched_lines = lines;
  }

  return {
    amount,
    conditions_display: buildConditionsDisplay(
      bestCondition,
      ruleDroveDiscount,
    ),
    matched_lines,
  };
}

export function computeBestAutoDiscount(
  campaigns: Array<
    Pick<
      PromotionCampaignEntity,
      'id' | 'name' | 'discountType' | 'value' | 'maxDiscount'
    > & {
      rules?: Pick<
        PromotionRuleEntity,
        'condition' | 'action' | 'sortOrder' | 'deletedAt'
      >[];
    }
  >,
  lines: PricingLineInput[],
  cartSubtotal: number,
): AutoPromotionQuote | null {
  let bestAmount = 0;
  let best: AutoPromotionQuote | null = null;
  for (const c of campaigns) {
    const res = computeCampaignDiscount(c, lines, cartSubtotal);
    if (res.amount > bestAmount) {
      bestAmount = res.amount;
      const line_allocations =
        res.amount > 0 && res.matched_lines.length > 0
          ? allocateProportionalDiscount(res.amount, res.matched_lines)
          : undefined;
      best = {
        campaign_id: c.id,
        campaign_name: c.name,
        discount_amount: res.amount,
        ...(res.conditions_display
          ? { conditions_display: res.conditions_display }
          : {}),
        ...(line_allocations?.length ? { line_allocations } : {}),
      };
    }
  }
  return best;
}

function minLineQuantityForRuleConditions(
  condition: PromotionRuleConditionJson,
  unitPrice: number,
): number {
  let q = 1;
  if (condition.min_quantity != null && condition.min_quantity > 0) {
    q = Math.max(q, condition.min_quantity);
  }
  if (
    condition.min_order_value != null &&
    condition.min_order_value > 0 &&
    unitPrice > 0
  ) {
    q = Math.max(q, Math.ceil(condition.min_order_value / unitPrice));
  }
  return q;
}

function collectCatalogPreviewQuantities(
  campaigns: Parameters<typeof computeBestAutoDiscount>[0],
  productId: string,
  categoryId: string,
  unitPrice: number,
): number[] {
  if (unitPrice <= 0) {
    return [1];
  }
  const quantities = new Set<number>([1]);
  const stub: PricingLineInput = {
    product_id: productId,
    category_id: categoryId,
    price: unitPrice,
    quantity: 1,
    subtotal: unitPrice,
  };
  for (const c of campaigns) {
    for (const r of (c.rules ?? []).filter((x) => !x.deletedAt)) {
      if (matchedLinesForRule([stub], r.condition).length === 0) {
        continue;
      }
      const need = minLineQuantityForRuleConditions(r.condition, unitPrice);
      if (need >= 1 && need <= CATALOG_PREVIEW_QTY_CAP) {
        quantities.add(need);
      }
    }
  }
  return [...quantities].sort((a, b) => a - b);
}

/**
 * PLP / product card: find the best AUTO discount for a single SKU by simulating
 * cart quantities 1 and rule-driven minimums (e.g. min_quantity=2), then expose
 * list unit price and per-unit price after discount for the winning simulation.
 */
export function computeCatalogProductPreview(
  campaigns: Parameters<typeof computeBestAutoDiscount>[0],
  productId: string,
  categoryId: string,
  unitPrice: number,
): {
  campaign_name: string;
  list_price: number;
  sale_price: number;
  discount_amount: number;
  conditions_display?: AutoPromotionConditionsDisplay;
  preview_quantity: number;
} | null {
  if (unitPrice <= 0) {
    return null;
  }
  const quantities = collectCatalogPreviewQuantities(
    campaigns,
    productId,
    categoryId,
    unitPrice,
  );
  let best: {
    campaign_name: string;
    list_price: number;
    sale_price: number;
    discount_amount: number;
    conditions_display?: AutoPromotionConditionsDisplay;
    preview_quantity: number;
  } | null = null;

  for (const q of quantities) {
    const subtotal = unitPrice * q;
    const line: PricingLineInput = {
      product_id: productId,
      category_id: categoryId,
      price: unitPrice,
      quantity: q,
      subtotal,
    };
    const auto = computeBestAutoDiscount(campaigns, [line], subtotal);
    const d = auto?.discount_amount ?? 0;
    if (d <= 0 || !auto?.campaign_name) {
      continue;
    }
    const saleUnit = Math.floor((subtotal - d) / q);
    const candidate = {
      campaign_name: auto.campaign_name,
      list_price: unitPrice,
      sale_price: saleUnit,
      discount_amount: d,
      preview_quantity: q,
      ...(auto.conditions_display
        ? { conditions_display: auto.conditions_display }
        : {}),
    };
    if (
      !best ||
      d > best.discount_amount ||
      (d === best.discount_amount && q < best.preview_quantity)
    ) {
      best = candidate;
    }
  }
  return best;
}

export function mergeStackBestOf(
  subtotal: number,
  coupon: CouponDiscountQuote,
  auto: AutoPromotionQuote | null,
): PricingQuoteResult {
  const autoAmount = auto?.discount_amount ?? 0;
  const couponAmount = coupon.amount;
  let discount_total = 0;
  let auto_promotion: AutoPromotionQuote | null = null;
  let coupon_discount = 0;
  let coupon_free_shipping = false;

  const useCoupon =
    couponAmount > autoAmount ||
    (couponAmount === autoAmount &&
      (couponAmount > 0 || (coupon.free_shipping && autoAmount === 0)));

  if (useCoupon) {
    discount_total = Math.min(couponAmount, subtotal);
    coupon_discount = discount_total;
    coupon_free_shipping = coupon.free_shipping;
  } else {
    discount_total = Math.min(autoAmount, subtotal);
    auto_promotion = auto;
  }

  const total_amount = Math.max(0, subtotal - discount_total);

  return {
    subtotal_amount: subtotal,
    coupon_discount,
    coupon_free_shipping,
    auto_discount: auto_promotion?.discount_amount ?? 0,
    auto_promotion,
    discount_total,
    total_amount,
    stack_mode: 'BEST_OF',
  };
}

export type PricingDiscountLineItem = AutoPromotionLineAllocation & {
  attribution?: 'auto' | 'coupon';
};

export function buildPricingSnapshot(params: {
  quote: PricingQuoteResult;
  coupon?: { id: string; code: string } | null;
  /** Per-product discount rows for cart / order UI (auto or proportional coupon). */
  discount_line_items?: PricingDiscountLineItem[];
}): Record<string, unknown> {
  const { quote, coupon, discount_line_items } = params;
  const snap: Record<string, unknown> = {
    subtotal_amount: quote.subtotal_amount,
    discount_total: quote.discount_total,
    total_amount: quote.total_amount,
    stack_mode: quote.stack_mode,
  };
  if (coupon && (quote.coupon_discount > 0 || quote.coupon_free_shipping)) {
    snap.coupon = {
      id: coupon.id,
      code: coupon.code,
      discount_amount: quote.coupon_discount,
    };
  }
  if (quote.auto_promotion && quote.auto_discount > 0) {
    const ap = quote.auto_promotion;
    snap.auto_promotion = {
      campaign_id: ap.campaign_id,
      campaign_name: ap.campaign_name,
      discount_amount: ap.discount_amount,
      ...(ap.conditions_display
        ? { conditions_display: ap.conditions_display }
        : {}),
    };
  }
  if (discount_line_items?.length) {
    snap.discount_line_items = discount_line_items;
  }
  if (quote.coupon_free_shipping) {
    snap.free_shipping = true;
  }
  return snap;
}
