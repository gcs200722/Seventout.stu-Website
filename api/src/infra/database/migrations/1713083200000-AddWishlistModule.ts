import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWishlistModule1713083200000 implements MigrationInterface {
  name = 'AddWishlistModule1713083200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wishlist_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL,
        product_id UUID NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_wishlist_items_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_wishlist_items_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        CONSTRAINT uq_wishlist_items_user_product UNIQUE (user_id, product_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_wishlist_items_user_id_created
      ON wishlist_items (user_id, created_at DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS wishlist_event_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(64) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        processed_at TIMESTAMPTZ NULL,
        failed_at TIMESTAMPTZ NULL,
        error_message TEXT NULL,
        retry_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_wishlist_event_outbox_pending
      ON wishlist_event_outbox (created_at ASC)
      WHERE processed_at IS NULL;
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('WISHLIST_MANAGE', 'Add, remove, and list own wishlist items')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'WISHLIST_MANAGE'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code = 'WISHLIST_MANAGE';
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code = 'WISHLIST_MANAGE';
    `);
    await queryRunner.query('DROP TABLE IF EXISTS wishlist_event_outbox;');
    await queryRunner.query('DROP TABLE IF EXISTS wishlist_items;');
  }
}
