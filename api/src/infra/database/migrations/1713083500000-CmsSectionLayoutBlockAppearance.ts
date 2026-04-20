import { MigrationInterface, QueryRunner } from 'typeorm';

export class CmsSectionLayoutBlockAppearance1713083500000 implements MigrationInterface {
  name = 'CmsSectionLayoutBlockAppearance1713083500000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cms_sections
      ADD COLUMN IF NOT EXISTS layout JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
    await queryRunner.query(`
      ALTER TABLE cms_blocks
      ADD COLUMN IF NOT EXISTS appearance JSONB NOT NULL DEFAULT '{}'::jsonb;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE cms_blocks DROP COLUMN IF EXISTS appearance;
    `);
    await queryRunner.query(`
      ALTER TABLE cms_sections DROP COLUMN IF EXISTS layout;
    `);
  }
}
