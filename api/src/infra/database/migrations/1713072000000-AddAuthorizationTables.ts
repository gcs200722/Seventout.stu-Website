import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuthorizationTables1713072000000 implements MigrationInterface {
  name = 'AddAuthorizationTables1713072000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'USER';
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        code VARCHAR(100) PRIMARY KEY,
        description VARCHAR(255) NOT NULL
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        user_id UUID NOT NULL,
        permission_code VARCHAR(100) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (user_id, permission_code),
        CONSTRAINT fk_user_permissions_user
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT fk_user_permissions_permission
          FOREIGN KEY (permission_code) REFERENCES permissions(code) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id
      ON user_permissions (user_id);
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('PRODUCT_MANAGE', 'Manage products'),
        ('ORDER_MANAGE', 'Manage orders'),
        ('USER_READ', 'Read users')
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS idx_user_permissions_user_id;',
    );
    await queryRunner.query('DROP TABLE IF EXISTS user_permissions;');
    await queryRunner.query('DROP TABLE IF EXISTS permissions;');
    await queryRunner.query('ALTER TABLE users DROP COLUMN IF EXISTS role;');
  }
}
