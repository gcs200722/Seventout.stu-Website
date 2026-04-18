import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewsModulePhase11713083100000 implements MigrationInterface {
  name = 'AddReviewsModulePhase11713083100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        user_id UUID NOT NULL,
        order_id UUID NOT NULL,
        rating SMALLINT NOT NULL,
        content TEXT NOT NULL DEFAULT '',
        media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        helpful_count INT NOT NULL DEFAULT 0,
        is_verified_purchase BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_reviews_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
        CONSTRAINT fk_reviews_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_reviews_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
        CONSTRAINT chk_reviews_rating CHECK (rating >= 1 AND rating <= 5)
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_reviews_user_product_order_active
      ON reviews (user_id, product_id, order_id)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_product_status_created
      ON reviews (product_id, status, created_at DESC)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_user_id
      ON reviews (user_id)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_order_id
      ON reviews (order_id)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_status
      ON reviews (status)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS review_interactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL,
        user_id UUID NOT NULL,
        type VARCHAR(20) NOT NULL,
        reason VARCHAR(32) NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_review_interactions_review
          FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE CASCADE,
        CONSTRAINT fk_review_interactions_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_interactions_review_id
      ON review_interactions (review_id);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_review_interactions_like
      ON review_interactions (review_id, user_id)
      WHERE type = 'LIKE';
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_review_interactions_report
      ON review_interactions (review_id, user_id)
      WHERE type = 'REPORT';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS product_review_stats (
        product_id UUID PRIMARY KEY,
        average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
        total_reviews INT NOT NULL DEFAULT 0,
        rating_distribution JSONB NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_product_review_stats_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS review_event_outbox (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NULL,
        event_type VARCHAR(64) NOT NULL,
        payload JSONB NOT NULL DEFAULT '{}'::jsonb,
        processed_at TIMESTAMPTZ NULL,
        failed_at TIMESTAMPTZ NULL,
        error_message TEXT NULL,
        retry_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT fk_review_event_outbox_review
          FOREIGN KEY (review_id) REFERENCES reviews(id) ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_review_event_outbox_pending
      ON review_event_outbox (created_at ASC)
      WHERE processed_at IS NULL;
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('REVIEW_READ', 'List and view product reviews for moderation'),
        ('REVIEW_MODERATE', 'Approve, reject, or hide product reviews')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'REVIEW_READ'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'REVIEW_MODERATE'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('REVIEW_READ', 'REVIEW_MODERATE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('REVIEW_READ', 'REVIEW_MODERATE');
    `);
    await queryRunner.query('DROP TABLE IF EXISTS review_event_outbox;');
    await queryRunner.query('DROP TABLE IF EXISTS review_interactions;');
    await queryRunner.query('DROP TABLE IF EXISTS product_review_stats;');
    await queryRunner.query('DROP TABLE IF EXISTS reviews;');
  }
}
