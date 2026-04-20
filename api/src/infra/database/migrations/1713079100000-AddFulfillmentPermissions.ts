import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFulfillmentPermissions1713079100000 implements MigrationInterface {
  name = 'AddFulfillmentPermissions1713079100000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('FULFILLMENT_READ', 'Read fulfillment information'),
        ('FULFILLMENT_UPDATE', 'Create and update fulfillment lifecycle')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'FULFILLMENT_READ'
      FROM users
      WHERE role = 'USER'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'FULFILLMENT_READ'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'FULFILLMENT_UPDATE'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('FULFILLMENT_READ', 'FULFILLMENT_UPDATE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('FULFILLMENT_READ', 'FULFILLMENT_UPDATE');
    `);
  }
}
