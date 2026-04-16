import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoryPermissions1713075000000 implements MigrationInterface {
  name = 'AddCategoryPermissions1713075000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('CATEGORY_READ', 'Read categories'),
        ('CATEGORY_MANAGE', 'Manage categories')
      ON CONFLICT (code) DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('CATEGORY_READ', 'CATEGORY_MANAGE');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('CATEGORY_READ', 'CATEGORY_MANAGE');
    `);
  }
}
