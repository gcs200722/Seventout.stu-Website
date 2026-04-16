import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderCreatePermission1713078500000 implements MigrationInterface {
  name = 'AddOrderCreatePermission1713078500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('ORDER_CREATE', 'Create orders from cart checkout')
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('ORDER_CREATE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('ORDER_CREATE');
    `);
  }
}
