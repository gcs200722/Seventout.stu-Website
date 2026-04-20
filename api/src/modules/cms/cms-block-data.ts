import { BadRequestException } from '@nestjs/common';
import { CmsBlockType, CmsSectionType } from './cms.types';
import { sanitizeCmsRichTextHtml } from './cms-rich-text.sanitize';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException({
      message: `Invalid block data: ${field} must be a non-empty string`,
      details: { code: 'INVALID_CMS_BLOCK_DATA', field },
    });
  }
  return value;
}

function assertOptionalString(
  value: unknown,
  field: string,
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new BadRequestException({
      message: `Invalid block data: ${field} must be a string`,
      details: { code: 'INVALID_CMS_BLOCK_DATA', field },
    });
  }
  return value;
}

function assertUuidList(value: unknown, field: string): string[] {
  if (!Array.isArray(value)) {
    throw new BadRequestException({
      message: `Invalid block data: ${field} must be an array`,
      details: { code: 'INVALID_CMS_BLOCK_DATA', field },
    });
  }
  for (const item of value) {
    if (typeof item !== 'string' || !UUID_RE.test(item)) {
      throw new BadRequestException({
        message: `Invalid block data: ${field} must contain UUID strings`,
        details: { code: 'INVALID_CMS_BLOCK_DATA', field },
      });
    }
  }
  return value as string[];
}

function mergeCmsMetaFields(
  raw: Record<string, unknown>,
  normalized: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...normalized };
  if (raw.i18n && typeof raw.i18n === 'object' && !Array.isArray(raw.i18n)) {
    out.i18n = raw.i18n;
  }
  if (
    raw.experiment &&
    typeof raw.experiment === 'object' &&
    !Array.isArray(raw.experiment)
  ) {
    const ex = raw.experiment as Record<string, unknown>;
    const key = typeof ex.key === 'string' ? ex.key : '';
    const arms = Array.isArray(ex.arms)
      ? ex.arms.filter((a): a is string => typeof a === 'string')
      : [];
    if (key.trim() && arms.length >= 2) {
      out.experiment = { key: key.trim(), arms: arms.slice(0, 4) };
    }
  }
  return out;
}

export function validateAndNormalizeBlockData(
  type: CmsBlockType,
  data: Record<string, unknown>,
): Record<string, unknown> {
  const normalized = ((): Record<string, unknown> => {
    switch (type) {
      case CmsBlockType.BANNER: {
        return {
          image_url: assertOptionalString(data.image_url, 'image_url') ?? '',
          title: assertString(data.title, 'title'),
          subtitle: assertOptionalString(data.subtitle, 'subtitle') ?? '',
          cta_text: assertOptionalString(data.cta_text, 'cta_text') ?? '',
          cta_link: assertOptionalString(data.cta_link, 'cta_link') ?? '',
        };
      }
      case CmsBlockType.PRODUCT: {
        const title = assertOptionalString(data.title, 'title') ?? '';
        const product_ids = assertUuidList(data.product_ids, 'product_ids');
        return { title, product_ids };
      }
      case CmsBlockType.CATEGORY: {
        const title = assertOptionalString(data.title, 'title') ?? '';
        if (!Array.isArray(data.categories)) {
          throw new BadRequestException({
            message: 'Invalid block data: categories must be an array',
            details: { code: 'INVALID_CMS_BLOCK_DATA', field: 'categories' },
          });
        }
        const categories: Array<Record<string, string>> = [];
        for (const raw of data.categories) {
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new BadRequestException({
              message: 'Invalid block data: each category must be an object',
              details: { code: 'INVALID_CMS_BLOCK_DATA' },
            });
          }
          const o = raw as Record<string, unknown>;
          const id = assertString(o.id, 'categories[].id');
          const name = assertString(o.name, 'categories[].name');
          const image =
            assertOptionalString(o.image, 'categories[].image') ?? '';
          categories.push({ id, name, image });
        }
        return { title, categories };
      }
      case CmsBlockType.HTML: {
        const html = assertString(data.html, 'html');
        if (html.length > 50_000) {
          throw new BadRequestException({
            message: 'HTML block content is too large',
            details: { code: 'CMS_HTML_TOO_LARGE' },
          });
        }
        return { html };
      }
      case CmsBlockType.BRAND_STORY: {
        return {
          image: assertString(data.image, 'image'),
          line1: assertString(data.line1, 'line1'),
          line2: assertOptionalString(data.line2, 'line2') ?? '',
        };
      }
      case CmsBlockType.LOOKBOOK: {
        if (!Array.isArray(data.images)) {
          throw new BadRequestException({
            message: 'Invalid block data: images must be an array of length 3',
            details: { code: 'INVALID_CMS_BLOCK_DATA', field: 'images' },
          });
        }
        if (data.images.length !== 3) {
          throw new BadRequestException({
            message: 'Invalid block data: lookbook requires exactly 3 images',
            details: { code: 'INVALID_CMS_BLOCK_DATA', field: 'images' },
          });
        }
        const imageRows = data.images as unknown[];
        const images: Array<{ src: string; alt: string }> = [];
        for (let i = 0; i < 3; i += 1) {
          const raw = imageRows[i];
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new BadRequestException({
              message: `Invalid block data: images[${i}] must be an object`,
              details: { code: 'INVALID_CMS_BLOCK_DATA' },
            });
          }
          const o = raw as Record<string, unknown>;
          images.push({
            src: assertString(o.src, `images[${i}].src`),
            alt: assertOptionalString(o.alt, `images[${i}].alt`) ?? '',
          });
        }
        return { images };
      }
      case CmsBlockType.VIDEO: {
        const src_mp4 = assertOptionalString(data.src_mp4, 'src_mp4') ?? '';
        const src_webm = assertOptionalString(data.src_webm, 'src_webm') ?? '';
        if (!src_mp4.trim() && !src_webm.trim()) {
          throw new BadRequestException({
            message: 'VIDEO block requires src_mp4 and/or src_webm',
            details: { code: 'INVALID_CMS_BLOCK_DATA' },
          });
        }
        const assertMediaUrl = (u: string, field: string): string => {
          const t = u.trim();
          if (!t) return '';
          if (
            t.startsWith('https://') ||
            t.startsWith('http://') ||
            t.startsWith('/')
          ) {
            return t;
          }
          throw new BadRequestException({
            message: `Invalid block data: ${field} must be http(s) URL or path`,
            details: { code: 'INVALID_CMS_BLOCK_DATA', field },
          });
        };
        const poster = assertOptionalString(data.poster, 'poster') ?? '';
        if (poster.trim()) {
          assertMediaUrl(poster, 'poster');
        }
        return {
          src_mp4: assertMediaUrl(src_mp4, 'src_mp4'),
          src_webm: assertMediaUrl(src_webm, 'src_webm'),
          poster: poster.trim(),
          loop: typeof data.loop === 'boolean' ? data.loop : true,
          muted: typeof data.muted === 'boolean' ? data.muted : true,
        };
      }
      case CmsBlockType.QUOTE: {
        const text = assertString(data.text, 'text');
        if (text.length > 4_000) {
          throw new BadRequestException({
            message: 'QUOTE text is too long',
            details: { code: 'CMS_QUOTE_TOO_LARGE' },
          });
        }
        const attribution =
          assertOptionalString(data.attribution, 'attribution') ?? '';
        if (attribution.length > 500) {
          throw new BadRequestException({
            message: 'QUOTE attribution is too long',
            details: { code: 'CMS_QUOTE_ATTRIBUTION_TOO_LARGE' },
          });
        }
        return { text, attribution };
      }
      case CmsBlockType.RICH_TEXT: {
        const raw = assertString(data.html, 'html');
        if (raw.length > 50_000) {
          throw new BadRequestException({
            message: 'RICH_TEXT content is too large',
            details: { code: 'CMS_RICH_TEXT_TOO_LARGE' },
          });
        }
        const html = sanitizeCmsRichTextHtml(raw);
        return { html };
      }
      case CmsBlockType.HOTSPOTS: {
        const assertMediaUrl = (u: string, field: string): string => {
          const t = u.trim();
          if (!t) {
            throw new BadRequestException({
              message: `Invalid block data: ${field} is required`,
              details: { code: 'INVALID_CMS_BLOCK_DATA', field },
            });
          }
          if (
            t.startsWith('https://') ||
            t.startsWith('http://') ||
            t.startsWith('/')
          ) {
            return t;
          }
          throw new BadRequestException({
            message: `Invalid block data: ${field} must be http(s) URL or path`,
            details: { code: 'INVALID_CMS_BLOCK_DATA', field },
          });
        };
        const image = assertMediaUrl(
          assertString(data.image, 'image'),
          'image',
        );
        if (!Array.isArray(data.hotspots)) {
          throw new BadRequestException({
            message: 'Invalid block data: hotspots must be an array',
            details: { code: 'INVALID_CMS_BLOCK_DATA', field: 'hotspots' },
          });
        }
        if (data.hotspots.length > 12) {
          throw new BadRequestException({
            message: 'Invalid block data: at most 12 hotspots',
            details: { code: 'INVALID_CMS_BLOCK_DATA' },
          });
        }
        const hotspotRows = data.hotspots as unknown[];
        const hotspots: Array<{ x: number; y: number; product_id: string }> =
          [];
        for (let i = 0; i < hotspotRows.length; i += 1) {
          const raw = hotspotRows[i];
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new BadRequestException({
              message: `Invalid block data: hotspots[${i}] must be an object`,
              details: { code: 'INVALID_CMS_BLOCK_DATA' },
            });
          }
          const o = raw as Record<string, unknown>;
          const x = typeof o.x === 'number' ? o.x : Number(o.x);
          const y = typeof o.y === 'number' ? o.y : Number(o.y);
          if (
            !Number.isFinite(x) ||
            x < 0 ||
            x > 1 ||
            !Number.isFinite(y) ||
            y < 0 ||
            y > 1
          ) {
            throw new BadRequestException({
              message: `Invalid block data: hotspots[${i}] x/y must be numbers in [0,1]`,
              details: { code: 'INVALID_CMS_BLOCK_DATA' },
            });
          }
          const product_id = assertString(
            o.product_id,
            `hotspots[${i}].product_id`,
          );
          if (!UUID_RE.test(product_id)) {
            throw new BadRequestException({
              message: `Invalid block data: hotspots[${i}].product_id must be UUID`,
              details: { code: 'INVALID_CMS_BLOCK_DATA' },
            });
          }
          hotspots.push({ x, y, product_id });
        }
        return { image, hotspots };
      }
      case CmsBlockType.JOURNAL_LIST: {
        if (!Array.isArray(data.entries)) {
          throw new BadRequestException({
            message: 'Invalid block data: entries must be an array',
            details: { code: 'INVALID_CMS_BLOCK_DATA', field: 'entries' },
          });
        }
        if (data.entries.length > 24) {
          throw new BadRequestException({
            message: 'Invalid block data: at most 24 journal entries',
            details: { code: 'INVALID_CMS_BLOCK_DATA' },
          });
        }
        const entryRows = data.entries as unknown[];
        const entries: Array<{ title: string; href: string; cover: string }> =
          [];
        for (let i = 0; i < entryRows.length; i += 1) {
          const raw = entryRows[i];
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new BadRequestException({
              message: `Invalid block data: entries[${i}] must be an object`,
              details: { code: 'INVALID_CMS_BLOCK_DATA' },
            });
          }
          const o = raw as Record<string, unknown>;
          entries.push({
            title: assertString(o.title, `entries[${i}].title`),
            href: assertString(o.href, `entries[${i}].href`),
            cover: assertString(o.cover, `entries[${i}].cover`),
          });
        }
        return { entries };
      }
      case CmsBlockType.MARQUEE_LOGOS: {
        if (!Array.isArray(data.logos)) {
          throw new BadRequestException({
            message: 'Invalid block data: logos must be an array',
            details: { code: 'INVALID_CMS_BLOCK_DATA', field: 'logos' },
          });
        }
        if (data.logos.length > 32) {
          throw new BadRequestException({
            message: 'Invalid block data: at most 32 logos',
            details: { code: 'INVALID_CMS_BLOCK_DATA' },
          });
        }
        const logoRows = data.logos as unknown[];
        const logos: Array<{ src: string; alt: string; href: string }> = [];
        for (let i = 0; i < logoRows.length; i += 1) {
          const raw = logoRows[i];
          if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new BadRequestException({
              message: `Invalid block data: logos[${i}] must be an object`,
              details: { code: 'INVALID_CMS_BLOCK_DATA' },
            });
          }
          const o = raw as Record<string, unknown>;
          logos.push({
            src: assertString(o.src, `logos[${i}].src`),
            alt: assertOptionalString(o.alt, `logos[${i}].alt`) ?? '',
            href: assertOptionalString(o.href, `logos[${i}].href`) ?? '',
          });
        }
        return { logos };
      }
      default:
        throw new BadRequestException({
          message: `Unsupported block type: ${String(type)}`,
          details: { code: 'INVALID_CMS_BLOCK_TYPE' },
        });
    }
  })();
  return mergeCmsMetaFields(data, normalized);
}

export function assertSectionType(value: string): void {
  const allowed = new Set<string>(Object.values(CmsSectionType));
  if (!allowed.has(value)) {
    throw new BadRequestException({
      message: `Unsupported section type: ${value}`,
      details: { code: 'INVALID_CMS_SECTION_TYPE' },
    });
  }
}

export function assertBlockType(value: string): CmsBlockType {
  const t = value as CmsBlockType;
  if (!Object.values(CmsBlockType).includes(t)) {
    throw new BadRequestException({
      message: `Unsupported block type: ${value}`,
      details: { code: 'INVALID_CMS_BLOCK_TYPE' },
    });
  }
  return t;
}

const MAX_LAYOUT_JSON_BYTES = 32_000;

export function assertLayoutOrAppearanceJson(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException({
      message: `Invalid ${field}: must be a plain object`,
      details: { code: 'INVALID_CMS_JSON_FIELD', field },
    });
  }
  const json = JSON.stringify(value);
  if (json.length > MAX_LAYOUT_JSON_BYTES) {
    throw new BadRequestException({
      message: `${field} JSON is too large`,
      details: { code: 'CMS_LAYOUT_TOO_LARGE', field },
    });
  }
  return value as Record<string, unknown>;
}
