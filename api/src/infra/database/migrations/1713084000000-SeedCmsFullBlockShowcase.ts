import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedCmsFullBlockShowcase1713084000000 implements MigrationInterface {
  name = 'SeedCmsFullBlockShowcase1713084000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO cms_pages (page_key, title, is_active)
      VALUES ('cms-showcase', 'CMS Full Block Showcase', true)
      ON CONFLICT (page_key) DO UPDATE
      SET title = EXCLUDED.title, is_active = EXCLUDED.is_active;
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      )
      INSERT INTO cms_sections (page_id, type, title, sort_order, is_active, layout, targeting)
      SELECT p.id, s.type, s.title, s.sort_order, true, '{}'::jsonb, '{}'::jsonb
      FROM p
      CROSS JOIN (
        VALUES
          ('HERO', 'Hero Banner', 10),
          ('BANNER', 'Promo Banner', 20),
          ('CATEGORY_GRID', 'Category Grid', 30),
          ('PRODUCT_CAROUSEL', 'Product Carousel', 40),
          ('STORY_CHAPTER', 'Brand Story', 50),
          ('LOOKBOOK_MOSAIC', 'Lookbook Mosaic', 60),
          ('EDITORIAL', 'Editorial Video', 70),
          ('EDITORIAL', 'Editorial Quote', 80),
          ('EDITORIAL', 'Editorial Rich Text', 90),
          ('SHOP_THE_LOOK', 'Shop The Look', 100),
          ('JOURNAL_ROW', 'Journal Row', 110),
          ('PRESS_MARQUEE', 'Press Marquee', 120)
      ) AS s(type, title, sort_order)
      WHERE NOT EXISTS (
        SELECT 1
        FROM cms_sections x
        WHERE x.page_id = p.id
          AND x.type = s.type
          AND x.title = s.title
          AND x.deleted_at IS NULL
      );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'BANNER', jsonb_build_object(
        'image_url', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1800&q=80',
        'title', 'CMS Showcase Hero',
        'subtitle', 'Demo du lieu cho tat ca block type.',
        'cta_text', 'Explore',
        'cta_link', '/collections'
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'HERO' AND s.title = 'Hero Banner'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'BANNER', jsonb_build_object(
        'image_url', '',
        'title', 'Mid Season Promotion',
        'subtitle', 'Uu dai showcase tu CMS.',
        'cta_text', 'Shop Deals',
        'cta_link', '/collections'
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'BANNER' AND s.title = 'Promo Banner'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'CATEGORY', jsonb_build_object(
        'title', 'Shop by Category',
        'categories', jsonb_build_array(
          jsonb_build_object('id', 'cat-1', 'name', 'Outerwear', 'image', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80', 'slug', 'outerwear'),
          jsonb_build_object('id', 'cat-2', 'name', 'Shirts', 'image', 'https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=900&q=80', 'slug', 'shirts'),
          jsonb_build_object('id', 'cat-3', 'name', 'Accessories', 'image', 'https://images.unsplash.com/photo-1479064555552-3ef4979f8908?auto=format&fit=crop&w=900&q=80', 'slug', 'accessories')
        )
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'CATEGORY_GRID' AND s.title = 'Category Grid'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      ),
      product_ids AS (
        SELECT COALESCE(jsonb_agg(id ORDER BY created_at DESC), '[]'::jsonb) AS ids
        FROM (
          SELECT id, created_at
          FROM products
          WHERE deleted_at IS NULL
          ORDER BY created_at DESC
          LIMIT 8
        ) x
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'PRODUCT', jsonb_build_object('title', 'Featured Products', 'product_ids', product_ids.ids), 10, true, '{}'::jsonb
      FROM s, product_ids
      WHERE s.type = 'PRODUCT_CAROUSEL' AND s.title = 'Product Carousel'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'BRAND_STORY', jsonb_build_object(
        'image', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=80',
        'line1', 'Tinh than local brand',
        'line2', 'Thiet ke toi gian, chat lieu tot, de phoi.'
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'STORY_CHAPTER' AND s.title = 'Brand Story'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'LOOKBOOK', jsonb_build_object(
        'images', jsonb_build_array(
          jsonb_build_object('src', 'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=80', 'alt', 'Look 1'),
          jsonb_build_object('src', 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80', 'alt', 'Look 2'),
          jsonb_build_object('src', 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80', 'alt', 'Look 3')
        )
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'LOOKBOOK_MOSAIC' AND s.title = 'Lookbook Mosaic'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'VIDEO', jsonb_build_object(
        'src_mp4', 'https://www.w3schools.com/html/mov_bbb.mp4',
        'src_webm', '',
        'poster', 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1200&q=80',
        'loop', true,
        'muted', true
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'EDITORIAL' AND s.title = 'Editorial Video'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'QUOTE', jsonb_build_object(
        'text', 'Style la cach ban noi chuyen ma khong can mot loi.',
        'attribution', 'CMS Demo'
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'EDITORIAL' AND s.title = 'Editorial Quote'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'RICH_TEXT', jsonb_build_object(
        'html', '<h2>Rich Text Block</h2><p>Noi dung da duoc sanitize o server.</p><ul><li>Heading</li><li>Paragraph</li><li>List</li></ul>'
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'EDITORIAL' AND s.title = 'Editorial Rich Text'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      ),
      fallback AS (
        SELECT COALESCE(
          (SELECT id::text FROM products WHERE deleted_at IS NULL ORDER BY created_at DESC LIMIT 1),
          '00000000-0000-4000-8000-000000000001'
        ) AS product_id
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'HOTSPOTS', jsonb_build_object(
        'image', 'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?auto=format&fit=crop&w=1600&q=80',
        'hotspots', jsonb_build_array(
          jsonb_build_object('x', 0.33, 'y', 0.42, 'product_id', fallback.product_id),
          jsonb_build_object('x', 0.67, 'y', 0.55, 'product_id', fallback.product_id)
        )
      ), 10, true, '{}'::jsonb
      FROM s, fallback
      WHERE s.type = 'SHOP_THE_LOOK' AND s.title = 'Shop The Look'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'JOURNAL_LIST', jsonb_build_object(
        'entries', jsonb_build_array(
          jsonb_build_object('title', 'Spring Editorial', 'href', '/collections', 'cover', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80'),
          jsonb_build_object('title', 'Tailoring Notes', 'href', '/collections', 'cover', 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80'),
          jsonb_build_object('title', 'Daily Layering', 'href', '/collections', 'cover', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80')
        )
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'JOURNAL_ROW' AND s.title = 'Journal Row'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);

    await queryRunner.query(`
      WITH p AS (
        SELECT id
        FROM cms_pages
        WHERE page_key = 'cms-showcase' AND deleted_at IS NULL
      ),
      s AS (
        SELECT cs.*
        FROM cms_sections cs
        INNER JOIN p ON p.id = cs.page_id
        WHERE cs.deleted_at IS NULL
      )
      INSERT INTO cms_blocks (section_id, type, data, sort_order, is_active, appearance)
      SELECT s.id, 'MARQUEE_LOGOS', jsonb_build_object(
        'logos', jsonb_build_array(
          jsonb_build_object('src', 'https://dummyimage.com/260x80/111/fff.png&text=VOGUE', 'alt', 'Vogue', 'href', ''),
          jsonb_build_object('src', 'https://dummyimage.com/260x80/111/fff.png&text=ELLE', 'alt', 'Elle', 'href', ''),
          jsonb_build_object('src', 'https://dummyimage.com/260x80/111/fff.png&text=BAZAAR', 'alt', 'Bazaar', 'href', '')
        )
      ), 10, true, '{}'::jsonb
      FROM s
      WHERE s.type = 'PRESS_MARQUEE' AND s.title = 'Press Marquee'
        AND NOT EXISTS (
          SELECT 1 FROM cms_blocks b WHERE b.section_id = s.id AND b.deleted_at IS NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM cms_pages
      WHERE page_key = 'cms-showcase';
    `);
  }
}
