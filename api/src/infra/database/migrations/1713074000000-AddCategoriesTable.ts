import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCategoriesTable1713074000000 implements MigrationInterface {
  name = 'AddCategoriesTable1713074000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(120) NOT NULL,
        slug VARCHAR(160) NOT NULL,
        description VARCHAR(500) NOT NULL DEFAULT '',
        parent_id UUID NULL,
        level SMALLINT NOT NULL,
        image_url VARCHAR(500) NOT NULL DEFAULT '',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_categories_parent
          FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT,
        CONSTRAINT chk_categories_level
          CHECK (level IN (1, 2))
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_slug
      ON categories (slug)
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_categories_parent_name
      ON categories (parent_id, LOWER(name))
      WHERE deleted_at IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_parent_id
      ON categories (parent_id)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_categories_parent_id;');
    await queryRunner.query('DROP INDEX IF EXISTS uq_categories_parent_name;');
    await queryRunner.query('DROP INDEX IF EXISTS uq_categories_slug;');
    await queryRunner.query('DROP TABLE IF EXISTS categories;');
  }
}
