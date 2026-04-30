import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTenantScopeToCmsPromotionsReviewsWishlistNotifications1713084500000 implements MigrationInterface {
  name =
    'AddTenantScopeToCmsPromotionsReviewsWishlistNotifications1713084500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const defaultTenantSql = `(SELECT id FROM tenants WHERE LOWER(slug) = 'default' LIMIT 1)`;

    await queryRunner.query(
      `ALTER TABLE cms_pages ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE cms_pages SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_pages ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_pages DROP CONSTRAINT IF EXISTS fk_cms_pages_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_pages ADD CONSTRAINT fk_cms_pages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_pages DROP CONSTRAINT IF EXISTS uq_cms_pages_page_key;`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_pages_tenant_page_key ON cms_pages (tenant_id, page_key);`,
    );

    await queryRunner.query(
      `ALTER TABLE cms_sections ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE cms_sections s SET tenant_id = p.tenant_id FROM cms_pages p WHERE s.page_id = p.id AND s.tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_sections ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_sections DROP CONSTRAINT IF EXISTS fk_cms_sections_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_sections ADD CONSTRAINT fk_cms_sections_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE cms_blocks ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE cms_blocks b SET tenant_id = s.tenant_id FROM cms_sections s WHERE b.section_id = s.id AND b.tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_blocks ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_blocks DROP CONSTRAINT IF EXISTS fk_cms_blocks_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_blocks ADD CONSTRAINT fk_cms_blocks_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE cms_assets ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE cms_assets SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_assets ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_assets DROP CONSTRAINT IF EXISTS fk_cms_assets_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_assets ADD CONSTRAINT fk_cms_assets_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE cms_themes ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE cms_themes SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_themes ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_themes DROP CONSTRAINT IF EXISTS fk_cms_themes_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_themes ADD CONSTRAINT fk_cms_themes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_themes DROP CONSTRAINT IF EXISTS uq_cms_themes_slug;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS uq_cms_themes_slug;`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_cms_themes_tenant_slug ON cms_themes (tenant_id, slug);`,
    );

    await queryRunner.query(
      `ALTER TABLE promotion_campaigns ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE promotion_campaigns SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_campaigns ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_campaigns DROP CONSTRAINT IF EXISTS fk_promotion_campaigns_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_campaigns ADD CONSTRAINT fk_promotion_campaigns_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE promotion_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE promotion_rules r SET tenant_id = c.tenant_id FROM promotion_campaigns c WHERE r.campaign_id = c.id AND r.tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_rules ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_rules DROP CONSTRAINT IF EXISTS fk_promotion_rules_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_rules ADD CONSTRAINT fk_promotion_rules_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE coupons ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE coupons SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupons ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupons DROP CONSTRAINT IF EXISTS fk_coupons_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupons ADD CONSTRAINT fk_coupons_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupons DROP CONSTRAINT IF EXISTS uq_coupons_code;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS uq_coupons_code;`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_coupons_tenant_code ON coupons (tenant_id, lower(code)) WHERE deleted_at IS NULL;`,
    );

    await queryRunner.query(
      `ALTER TABLE coupon_usages ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE coupon_usages u SET tenant_id = c.tenant_id FROM coupons c WHERE u.coupon_id = c.id AND u.tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupon_usages ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupon_usages DROP CONSTRAINT IF EXISTS fk_coupon_usages_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupon_usages ADD CONSTRAINT fk_coupon_usages_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE reviews SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE reviews ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE reviews DROP CONSTRAINT IF EXISTS fk_reviews_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE reviews ADD CONSTRAINT fk_reviews_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE review_interactions ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE review_interactions i SET tenant_id = r.tenant_id FROM reviews r WHERE i.review_id = r.id AND i.tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_interactions ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_interactions DROP CONSTRAINT IF EXISTS fk_review_interactions_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_interactions ADD CONSTRAINT fk_review_interactions_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE product_review_stats ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE product_review_stats SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE product_review_stats ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE product_review_stats DROP CONSTRAINT IF EXISTS fk_product_review_stats_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE product_review_stats ADD CONSTRAINT fk_product_review_stats_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE review_event_outbox ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE review_event_outbox o SET tenant_id = r.tenant_id FROM reviews r WHERE o.review_id = r.id AND o.tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `UPDATE review_event_outbox SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_event_outbox ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_event_outbox DROP CONSTRAINT IF EXISTS fk_review_event_outbox_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_event_outbox ADD CONSTRAINT fk_review_event_outbox_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE wishlist_items ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE wishlist_items wi SET tenant_id = p.tenant_id FROM products p WHERE wi.product_id = p.id AND wi.tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `UPDATE wishlist_items SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_items ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS fk_wishlist_items_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_items ADD CONSTRAINT fk_wishlist_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE wishlist_event_outbox ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE wishlist_event_outbox SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_event_outbox ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_event_outbox DROP CONSTRAINT IF EXISTS fk_wishlist_event_outbox_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_event_outbox ADD CONSTRAINT fk_wishlist_event_outbox_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );

    await queryRunner.query(
      `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE notifications SET tenant_id = ${defaultTenantSql} WHERE tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE notifications ADD CONSTRAINT fk_notifications_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS uq_notifications_dedupe;`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_tenant_dedupe ON notifications (tenant_id, event_source, event_id, channel, user_id, type);`,
    );

    await queryRunner.query(
      `ALTER TABLE notification_delivery_attempts ADD COLUMN IF NOT EXISTS tenant_id UUID;`,
    );
    await queryRunner.query(
      `UPDATE notification_delivery_attempts a SET tenant_id = n.tenant_id FROM notifications n WHERE a.notification_id = n.id AND a.tenant_id IS NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE notification_delivery_attempts ALTER COLUMN tenant_id SET NOT NULL;`,
    );
    await queryRunner.query(
      `ALTER TABLE notification_delivery_attempts DROP CONSTRAINT IF EXISTS fk_notification_attempts_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE notification_delivery_attempts ADD CONSTRAINT fk_notification_attempts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE RESTRICT;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE notification_delivery_attempts DROP CONSTRAINT IF EXISTS fk_notification_attempts_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE notification_delivery_attempts DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_notifications_tenant_dedupe;`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_dedupe ON notifications (event_source, event_id, channel, user_id, type);`,
    );
    await queryRunner.query(
      `ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE notifications DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_event_outbox DROP CONSTRAINT IF EXISTS fk_wishlist_event_outbox_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_event_outbox DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_items DROP CONSTRAINT IF EXISTS fk_wishlist_items_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE wishlist_items DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_event_outbox DROP CONSTRAINT IF EXISTS fk_review_event_outbox_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_event_outbox DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE product_review_stats DROP CONSTRAINT IF EXISTS fk_product_review_stats_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE product_review_stats DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_interactions DROP CONSTRAINT IF EXISTS fk_review_interactions_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE review_interactions DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE reviews DROP CONSTRAINT IF EXISTS fk_reviews_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE reviews DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupon_usages DROP CONSTRAINT IF EXISTS fk_coupon_usages_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupon_usages DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS uq_coupons_tenant_code;`);
    await queryRunner.query(
      `ALTER TABLE coupons DROP CONSTRAINT IF EXISTS fk_coupons_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE coupons DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_rules DROP CONSTRAINT IF EXISTS fk_promotion_rules_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_rules DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_campaigns DROP CONSTRAINT IF EXISTS fk_promotion_campaigns_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE promotion_campaigns DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS uq_cms_themes_tenant_slug;`);
    await queryRunner.query(
      `ALTER TABLE cms_themes DROP CONSTRAINT IF EXISTS fk_cms_themes_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_themes DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_assets DROP CONSTRAINT IF EXISTS fk_cms_assets_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_assets DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_blocks DROP CONSTRAINT IF EXISTS fk_cms_blocks_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_blocks DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_sections DROP CONSTRAINT IF EXISTS fk_cms_sections_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_sections DROP COLUMN IF EXISTS tenant_id;`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS uq_cms_pages_tenant_page_key;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_pages DROP CONSTRAINT IF EXISTS fk_cms_pages_tenant;`,
    );
    await queryRunner.query(
      `ALTER TABLE cms_pages DROP COLUMN IF EXISTS tenant_id;`,
    );
  }
}
