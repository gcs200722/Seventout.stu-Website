import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleAuthToUsers1713084100000 implements MigrationInterface {
  name = 'AddGoogleAuthToUsers1713084100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_users_google_id
      ON users (google_id)
      WHERE google_id IS NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) NOT NULL DEFAULT 'local';
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN password_hash DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE users
      SET password_hash = ''
      WHERE password_hash IS NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      ALTER COLUMN password_hash SET NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS auth_provider;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS uq_users_google_id;
    `);

    await queryRunner.query(`
      ALTER TABLE users
      DROP COLUMN IF EXISTS google_id;
    `);
  }
}
