import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCmsMerchandisingModule1713082000000 implements MigrationInterface {
  name = 'AddCmsMerchandisingModule1713082000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cms_pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        page_key VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT uq_cms_pages_page_key UNIQUE (page_key)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_pages_deleted_at
      ON cms_pages (deleted_at);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cms_sections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        page_id UUID NOT NULL,
        type VARCHAR(64) NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_cms_sections_page
          FOREIGN KEY (page_id) REFERENCES cms_pages(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_sections_page_id_sort
      ON cms_sections (page_id, sort_order);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_sections_deleted_at
      ON cms_sections (deleted_at);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS cms_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        section_id UUID NOT NULL,
        type VARCHAR(64) NOT NULL,
        data JSONB NOT NULL DEFAULT '{}'::jsonb,
        sort_order INT NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        deleted_at TIMESTAMPTZ NULL,
        CONSTRAINT fk_cms_blocks_section
          FOREIGN KEY (section_id) REFERENCES cms_sections(id) ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_blocks_section_id_sort
      ON cms_blocks (section_id, sort_order);
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_cms_blocks_deleted_at
      ON cms_blocks (deleted_at);
    `);

    await queryRunner.query(`
      INSERT INTO permissions (code, description)
      VALUES
        ('CMS_READ', 'Read CMS pages and merchandising configuration'),
        ('CMS_EDIT', 'Create and update CMS pages, sections, and blocks')
      ON CONFLICT (code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'CMS_READ'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO user_permissions (user_id, permission_code)
      SELECT id, 'CMS_EDIT'
      FROM users
      WHERE role = 'STAFF'
      ON CONFLICT (user_id, permission_code) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO cms_pages (page_key, title, is_active)
      VALUES ('homepage', 'Homepage', true)
      ON CONFLICT (page_key) DO NOTHING;
    `);

    await queryRunner.query(`
      INSERT INTO cms_sections (page_id, type, title, sort_order, is_active)
      SELECT p.id, 'HERO', 'Hero', 10, true
      FROM cms_pages p
      WHERE p.page_key = 'homepage' AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cms_sections s
          WHERE s.page_id = p.id AND s.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active)
      SELECT s.id, 'BANNER', jsonb_build_object(
        'image_url', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=80',
        'title', 'Nang cap tu do voi tinh than local brand',
        'subtitle', 'Kham pha BST streetwear toi gian, form de mac va phoi do linh hoat cho moi hoat dong hang ngay.',
        'cta_text', 'Shop Now',
        'cta_link', '/collections'
      ), 10, true
      FROM cms_sections s
      INNER JOIN cms_pages p ON p.id = s.page_id
      WHERE p.page_key = 'homepage' AND s.type = 'HERO' AND s.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b
          WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      INSERT INTO cms_sections (page_id, type, title, sort_order, is_active)
      SELECT p.id, 'FEATURED_COLLECTIONS', 'Featured Collections', 20, true
      FROM cms_pages p
      WHERE p.page_key = 'homepage' AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cms_sections s
          WHERE s.page_id = p.id AND s.type = 'FEATURED_COLLECTIONS' AND s.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      INSERT INTO cms_sections (page_id, type, title, sort_order, is_active)
      SELECT p.id, 'PRODUCT_CAROUSEL', 'Best Selling Products', 30, true
      FROM cms_pages p
      WHERE p.page_key = 'homepage' AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cms_sections s
          WHERE s.page_id = p.id AND s.type = 'PRODUCT_CAROUSEL' AND s.title = 'Best Selling Products' AND s.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active)
      SELECT s.id, 'PRODUCT', jsonb_build_object(
        'title', 'Best Selling Products',
        'product_ids', '[]'::jsonb
      ), 10, true
      FROM cms_sections s
      INNER JOIN cms_pages p ON p.id = s.page_id
      WHERE p.page_key = 'homepage' AND s.type = 'PRODUCT_CAROUSEL' AND s.title = 'Best Selling Products' AND s.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b
          WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      INSERT INTO cms_sections (page_id, type, title, sort_order, is_active)
      SELECT p.id, 'PRODUCT_CAROUSEL', 'New Arrivals', 40, true
      FROM cms_pages p
      WHERE p.page_key = 'homepage' AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cms_sections s
          WHERE s.page_id = p.id AND s.type = 'PRODUCT_CAROUSEL' AND s.title = 'New Arrivals' AND s.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active)
      SELECT s.id, 'PRODUCT', jsonb_build_object(
        'title', 'New Arrivals',
        'product_ids', '[]'::jsonb
      ), 10, true
      FROM cms_sections s
      INNER JOIN cms_pages p ON p.id = s.page_id
      WHERE p.page_key = 'homepage' AND s.type = 'PRODUCT_CAROUSEL' AND s.title = 'New Arrivals' AND s.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b
          WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      INSERT INTO cms_sections (page_id, type, title, sort_order, is_active)
      SELECT p.id, 'BANNER', 'Promo strip', 50, true
      FROM cms_pages p
      WHERE p.page_key = 'homepage' AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cms_sections s
          WHERE s.page_id = p.id AND s.type = 'BANNER' AND s.title = 'Promo strip' AND s.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active)
      SELECT s.id, 'BANNER', jsonb_build_object(
        'image_url', '',
        'title', 'Mid Season Sale - Up to 40% Off',
        'subtitle', 'Ap dung cho selected items trong 72 gio. So luong gioi han, uu dai ket thuc khi het hang.',
        'cta_text', 'Shop Deals',
        'cta_link', '/collections'
      ), 10, true
      FROM cms_sections s
      INNER JOIN cms_pages p ON p.id = s.page_id
      WHERE p.page_key = 'homepage' AND s.type = 'BANNER' AND s.title = 'Promo strip' AND s.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b
          WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM user_permissions
      WHERE permission_code IN ('CMS_READ', 'CMS_EDIT');
    `);
    await queryRunner.query(`
      DELETE FROM permissions
      WHERE code IN ('CMS_READ', 'CMS_EDIT');
    `);
    await queryRunner.query('DROP TABLE IF EXISTS cms_blocks;');
    await queryRunner.query('DROP TABLE IF EXISTS cms_sections;');
    await queryRunner.query('DROP TABLE IF EXISTS cms_pages;');
  }
}
