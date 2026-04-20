import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromotionsModule1713083000000 implements MigrationInterface {
  name = 'AddPromotionsModule1713083000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(64) NOT NULL,
        type VARCHAR(20) NOT NULL,
        value INT NOT NULL DEFAULT 0,
        min_order_value INT NOT NULL DEFAULT 0,
        max_discount INT NULL,
        usage_limit INT NULL,
        used_count INT NOT NULL DEFAULT 0,
        max_uses_per_user INT NOT NULL DEFAULT 1,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_coupons_code_lower
      ON coupons (lower(code))
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_coupons_active_window
      ON coupons (is_active, start_date, end_date)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promotion_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL,
        discount_type VARCHAR(20) NOT NULL,
        value INT NOT NULL DEFAULT 0,
        max_discount INT NULL,
        priority INT NOT NULL DEFAULT 0,
        start_date TIMESTAMPTZ NOT NULL,
        end_date TIMESTAMPTZ NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promotion_campaigns_active
      ON promotion_campaigns (is_active, start_date, end_date, priority DESC)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS promotion_rules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL,
        condition JSONB NOT NULL DEFAULT '{}'::jsonb,
        action JSONB NOT NULL DEFAULT '{}'::jsonb,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_promotion_rules_campaign
          FOREIGN KEY (campaign_id) REFERENCES promotion_campaigns(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_promotion_rules_campaign
      ON promotion_rules (campaign_id, sort_order)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS coupon_usages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        coupon_id UUID NOT NULL,
        user_id UUID NOT NULL,
        order_id UUID NOT NULL,
        discount_amount INT NOT NULL DEFAULT 0,
        used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_coupon_usages_coupon
          FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE RESTRICT,
        CONSTRAINT fk_coupon_usages_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_coupon_usages_user_coupon
      ON coupon_usages (user_id, coupon_id);
    `);

    await queryRunner.query(`
      ALTER TABLE carts
      ADD COLUMN IF NOT EXISTS applied_coupon_id UUID NULL;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_carts_applied_coupon'
        ) THEN
          ALTER TABLE carts
          ADD CONSTRAINT fk_carts_applied_coupon
          FOREIGN KEY (applied_coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS discount_total INT NOT NULL DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('PROMOTION_READ', 'View coupons and promotion campaigns'),
        ('PROMOTION_MANAGE', 'Create and update coupons, campaigns, and promotion rules')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'PROMOTION_READ'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'PROMOTION_MANAGE'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('PROMOTION_READ', 'PROMOTION_MANAGE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('PROMOTION_READ', 'PROMOTION_MANAGE');
    `);

    await queryRunner.query(`
      ALTER TABLE orders DROP COLUMN IF EXISTS pricing_snapshot;
    `);
    await queryRunner.query(`
      ALTER TABLE orders DROP COLUMN IF EXISTS discount_total;
    `);

    await queryRunner.query(`
      ALTER TABLE carts DROP CONSTRAINT IF EXISTS fk_carts_applied_coupon;
    `);
    await queryRunner.query(`
      ALTER TABLE carts DROP COLUMN IF EXISTS applied_coupon_id;
    `);

    await queryRunner.query('DROP TABLE IF EXISTS coupon_usages;');
    await queryRunner.query('DROP TABLE IF EXISTS promotion_rules;');
    await queryRunner.query('DROP TABLE IF EXISTS promotion_campaigns;');
    await queryRunner.query('DROP TABLE IF EXISTS coupons;');
  }
}
