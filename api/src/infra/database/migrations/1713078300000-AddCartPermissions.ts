import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCartPermissions1713078300000 implements MigrationInterface {
  name = 'AddCartPermissions1713078300000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('CART_READ', 'Read current user cart'),
        ('CART_MANAGE', 'Manage cart and checkout')
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('CART_READ', 'CART_MANAGE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('CART_READ', 'CART_MANAGE');
    `);
  }
}
