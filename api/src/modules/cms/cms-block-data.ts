import { BadRequestException } from '@nestjs/common';
import { CmsBlockType, CmsSectionType } from './cms.types';

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

export function validateAndNormalizeBlockData(
  type: CmsBlockType,
  data: Record<string, unknown>,
): Record<string, unknown> {
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
        const image = assertOptionalString(o.image, 'categories[].image') ?? '';
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
    default:
      throw new BadRequestException({
        message: `Unsupported block type: ${String(type)}`,
        details: { code: 'INVALID_CMS_BLOCK_TYPE' },
      });
  }
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
