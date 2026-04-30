import {
  computeBestAutoDiscount,
  computeCampaignDiscount,
  computeCatalogProductPreview,
  computeCouponDiscount,
  mergeStackBestOf,
} from './promotion-engine.domain';
import { CouponType, DiscountType } from './promotions.types';

describe('promotion-engine.domain', () => {
  it('computes percent coupon with cap', () => {
    const q = computeCouponDiscount(CouponType.PERCENT, 20, 100000, 0, 15000);
    expect(q.amount).toBe(15000);
    expect(q.free_shipping).toBe(false);
  });

  it('respects min order for coupon', () => {
    const q = computeCouponDiscount(CouponType.FIXED, 5000, 4000, 10000, null);
    expect(q.amount).toBe(0);
  });

  it('mergeStackBestOf picks higher auto discount', () => {
    const merged = mergeStackBestOf(
      100000,
      { amount: 5000, free_shipping: false },
      {
        campaign_id: 'c1',
        campaign_name: 'Sale',
        discount_amount: 30000,
      },
    );
    expect(merged.discount_total).toBe(30000);
    expect(merged.total_amount).toBe(70000);
    expect(merged.auto_promotion?.campaign_id).toBe('c1');
  });

  it('computeBestAutoDiscount picks best campaign', () => {
    const best = computeBestAutoDiscount(
      [
        {
          id: 'a',
          name: 'Low',
          discountType: DiscountType.FIXED,
          value: 1000,
          maxDiscount: null,
          rules: [],
        },
        {
          id: 'b',
          name: 'High',
          discountType: DiscountType.PERCENT,
          value: 50,
          maxDiscount: null,
          rules: [],
        },
      ],
      [
        {
          product_id: 'p1',
          category_id: 'cat',
          price: 10000,
          quantity: 1,
          subtotal: 10000,
        },
      ],
      10000,
    );
    expect(best?.campaign_id).toBe('b');
    expect(best?.discount_amount).toBe(5000);
  });

  it('computeCampaignDiscount does not apply campaign baseline outside scoped rule', () => {
    const { amount, matched_lines } = computeCampaignDiscount(
      {
        id: 'c',
        name: 'SALE_10%',
        discountType: DiscountType.PERCENT,
        value: 10,
        maxDiscount: null,
        rules: [
          {
            condition: { product_ids: ['p-trousers'] },
            action: {
              discount_type: DiscountType.PERCENT,
              value: 10,
              max_discount: null,
            },
            sortOrder: 0,
            deletedAt: null,
          },
        ],
      },
      [
        {
          product_id: 'p-hoodie',
          category_id: 'cat-h',
          price: 200000,
          quantity: 1,
          subtotal: 200000,
        },
      ],
      200000,
    );
    expect(amount).toBe(0);
    expect(matched_lines).toEqual([]);
  });

  it('computeCampaignDiscount still applies baseline when rules have no product/category scope', () => {
    const { amount, matched_lines } = computeCampaignDiscount(
      {
        id: 'c',
        name: 'SALE',
        discountType: DiscountType.PERCENT,
        value: 10,
        maxDiscount: null,
        rules: [
          {
            condition: { min_order_value: 0 },
            action: {
              discount_type: DiscountType.PERCENT,
              value: 5,
              max_discount: null,
            },
            sortOrder: 0,
            deletedAt: null,
          },
        ],
      },
      [
        {
          product_id: 'p1',
          category_id: 'cat',
          price: 100000,
          quantity: 1,
          subtotal: 100000,
        },
      ],
      100000,
    );
    expect(amount).toBe(10000);
    expect(matched_lines).toHaveLength(1);
  });

  it('computeCampaignDiscount attaches conditions_display when rule drives discount', () => {
    const { amount, conditions_display, matched_lines } =
      computeCampaignDiscount(
        {
          id: 'c',
          name: 'Sale',
          discountType: DiscountType.PERCENT,
          value: 10,
          maxDiscount: null,
          rules: [
            {
              condition: {
                product_ids: ['p1'],
                min_quantity: 2,
                min_order_value: 200_000,
              },
              action: {
                discount_type: DiscountType.PERCENT,
                value: 10,
                max_discount: 40_000,
              },
              sortOrder: 0,
              deletedAt: null,
            },
          ],
        },
        [
          {
            product_id: 'p1',
            category_id: 'cat',
            price: 500_000,
            quantity: 2,
            subtotal: 1_000_000,
          },
        ],
        1_000_000,
      );
    expect(amount).toBe(40_000);
    expect(conditions_display).toEqual({
      min_quantity: 2,
      min_order_value: 200_000,
      scoped_to_products: true,
      scoped_to_categories: false,
    });
    expect(matched_lines).toHaveLength(1);
    expect(matched_lines[0]?.product_id).toBe('p1');
  });

  it('computeCampaignDiscount attaches scope flags for product-only rule without min thresholds', () => {
    const { amount, conditions_display, matched_lines } =
      computeCampaignDiscount(
        {
          id: 'c',
          name: 'SKU Sale',
          discountType: DiscountType.PERCENT,
          value: 10,
          maxDiscount: null,
          rules: [
            {
              condition: { product_ids: ['p1'] },
              action: {
                discount_type: DiscountType.PERCENT,
                value: 10,
                max_discount: null,
              },
              sortOrder: 0,
              deletedAt: null,
            },
          ],
        },
        [
          {
            product_id: 'p1',
            category_id: 'cat',
            price: 100_000,
            quantity: 1,
            subtotal: 100_000,
          },
        ],
        100_000,
      );
    expect(amount).toBe(10_000);
    expect(conditions_display).toEqual({
      min_quantity: null,
      min_order_value: null,
      scoped_to_products: true,
      scoped_to_categories: false,
    });
    expect(matched_lines).toHaveLength(1);
  });

  it('computeCampaignDiscount attaches scope flags for category-only rule', () => {
    const { amount, conditions_display, matched_lines } =
      computeCampaignDiscount(
        {
          id: 'c',
          name: 'Cat Sale',
          discountType: DiscountType.PERCENT,
          value: 5,
          maxDiscount: null,
          rules: [
            {
              condition: { category_ids: ['cat-a'] },
              action: {
                discount_type: DiscountType.PERCENT,
                value: 5,
                max_discount: null,
              },
              sortOrder: 0,
              deletedAt: null,
            },
          ],
        },
        [
          {
            product_id: 'p1',
            category_id: 'cat-a',
            price: 200_000,
            quantity: 1,
            subtotal: 200_000,
          },
        ],
        200_000,
      );
    expect(amount).toBe(10_000);
    expect(conditions_display).toEqual({
      min_quantity: null,
      min_order_value: null,
      scoped_to_products: false,
      scoped_to_categories: true,
    });
    expect(matched_lines).toHaveLength(1);
  });

  it('computeBestAutoDiscount includes line_allocations summing to discount_amount', () => {
    const auto = computeBestAutoDiscount(
      [
        {
          id: 'c',
          name: 'Mix',
          discountType: DiscountType.PERCENT,
          value: 10,
          maxDiscount: null,
          rules: [
            {
              condition: { product_ids: ['p1', 'p2'] },
              action: {
                discount_type: DiscountType.PERCENT,
                value: 10,
                max_discount: null,
              },
              sortOrder: 0,
              deletedAt: null,
            },
          ],
        },
      ],
      [
        {
          product_id: 'p1',
          category_id: 'c1',
          price: 100_000,
          quantity: 1,
          subtotal: 100_000,
          product_name: 'A',
        },
        {
          product_id: 'p2',
          category_id: 'c2',
          price: 200_000,
          quantity: 1,
          subtotal: 200_000,
          product_name: 'B',
        },
      ],
      300_000,
    );
    expect(auto?.discount_amount).toBe(30_000);
    const sum = (auto?.line_allocations ?? []).reduce(
      (s, r) => s + r.discount_amount,
      0,
    );
    expect(sum).toBe(30_000);
    expect(auto?.line_allocations).toHaveLength(2);
  });

  it('computeCatalogProductPreview uses min_quantity so PLP can show sale unit price', () => {
    const campaigns = [
      {
        id: 'c',
        name: 'Sale 10%',
        discountType: DiscountType.PERCENT,
        value: 10,
        maxDiscount: null,
        rules: [
          {
            condition: {
              product_ids: ['p-trousers'],
              min_quantity: 2,
              min_order_value: 200_000,
            },
            action: {
              discount_type: DiscountType.PERCENT,
              value: 10,
              max_discount: 40_000,
            },
            sortOrder: 0,
            deletedAt: null,
          },
        ],
      },
    ];
    const preview = computeCatalogProductPreview(
      campaigns,
      'p-trousers',
      'cat',
      500_000,
    );
    expect(preview).not.toBeNull();
    expect(preview?.campaign_name).toBe('Sale 10%');
    expect(preview?.list_price).toBe(500_000);
    expect(preview?.sale_price).toBe(480_000);
    expect(preview?.discount_amount).toBe(40_000);
    expect(preview?.preview_quantity).toBe(2);
    expect(preview?.conditions_display).toEqual({
      min_quantity: 2,
      min_order_value: 200_000,
      scoped_to_products: true,
      scoped_to_categories: false,
    });
  });

  it('computeCatalogProductPreview returns null when min_quantity blocks qty=1 only', () => {
    const preview = computeCatalogProductPreview(
      [
        {
          id: 'c',
          name: 'Sale',
          discountType: DiscountType.PERCENT,
          value: 10,
          maxDiscount: null,
          rules: [
            {
              condition: { product_ids: ['other'], min_quantity: 2 },
              action: {
                discount_type: DiscountType.PERCENT,
                value: 10,
                max_discount: null,
              },
              sortOrder: 0,
              deletedAt: null,
            },
          ],
        },
      ],
      'p-trousers',
      'cat',
      500_000,
    );
    expect(preview).toBeNull();
  });
});
