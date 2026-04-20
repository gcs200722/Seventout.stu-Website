import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFulfillmentModulePhase11713079000000 implements MigrationInterface {
  name = 'AddFulfillmentModulePhase11713079000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS fulfillments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        tracking_code VARCHAR(120) NULL,
        shipping_provider VARCHAR(64) NULL,
        note TEXT NOT NULL DEFAULT '',
        shipped_at TIMESTAMPTZ NULL,
        delivered_at TIMESTAMPTZ NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_fulfillments_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_fulfillments_order_id
      ON fulfillments (order_id)
      WHERE deleted_at IS NULL;
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_fulfillments_status_created_at
      ON fulfillments (status, created_at DESC)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_fulfillments_status_created_at;',
    );
    await queryRunner.query('DROP INDEX IF EXISTS uq_fulfillments_order_id;');
    await queryRunner.query('DROP TABLE IF EXISTS fulfillments;');
  }
}
