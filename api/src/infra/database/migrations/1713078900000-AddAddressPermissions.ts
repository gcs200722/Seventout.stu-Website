import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAddressPermissions1713078900000 implements MigrationInterface {
  name = 'AddAddressPermissions1713078900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('ADDRESS_CREATE', 'Create shipping addresses'),
        ('ADDRESS_READ', 'Read shipping addresses'),
        ('ADDRESS_UPDATE', 'Update shipping addresses'),
        ('ADDRESS_DELETE', 'Delete shipping addresses')
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN (
        'ADDRESS_CREATE',
        'ADDRESS_READ',
        'ADDRESS_UPDATE',
        'ADDRESS_DELETE'
      );
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN (
        'ADDRESS_CREATE',
        'ADDRESS_READ',
        'ADDRESS_UPDATE',
        'ADDRESS_DELETE'
      );
    `);
  }
}
