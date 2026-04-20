import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryPermissions1713078100000 implements MigrationInterface {
  name = 'AddInventoryPermissions1713078100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('INVENTORY_READ', 'Read inventory'),
        ('INVENTORY_MANAGE', 'Manage inventory and stock sync')
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('INVENTORY_READ', 'INVENTORY_MANAGE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('INVENTORY_READ', 'INVENTORY_MANAGE');
    `);
  }
}
