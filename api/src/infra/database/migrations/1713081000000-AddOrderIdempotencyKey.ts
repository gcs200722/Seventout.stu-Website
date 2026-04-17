import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderIdempotencyKey1713081000000 implements MigrationInterface {
  name = 'AddOrderIdempotencyKey1713081000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(120) NULL;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_user_idempotency_key
      ON orders (user_id, idempotency_key)
      WHERE deleted_at IS NULL AND idempotency_key IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS uq_orders_user_idempotency_key;',
    );
    await queryRunner.query(`
      ALTER TABLE orders
      DROP COLUMN IF EXISTS idempotency_key;
    `);
  }
}
