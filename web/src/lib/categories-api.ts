import type { Collection } from "@/components/home/CollectionCard";

import { getApiErrorMessage } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-fetch";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
};

export type CategoryListItem = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  level: 1 | 2;
  image_url: string;
  is_active: boolean;
};

export type CategoryDetail = CategoryListItem & {
  description: string;
};

export type CategoryTreeItem = {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    image_url: string;
  }>;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80";

const defaultFetchInit: RequestInit = {
  next: { revalidate: 60 },
  headers: { "Content-Type": "application/json" },
};

async function readEnvelope<T>(response: Response): Promise<ApiEnvelope<T>> {
  const json = (await response.json()) as ApiEnvelope<T>;
  if (!response.ok) {
    const message = getApiErrorMessage(json, "Không tải được danh mục.");
    throw new Error(message);
  }
  if (!json.success || json.data === undefined) {
    throw new Error("Unexpected API response format");
  }
  return json;
}

export function categoriesQueryString(params: {
  page?: number;
  limit?: number;
  parent_id?: string | null;
}) {
  const query = new URLSearchParams();
  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params.parent_id === null) {
    query.set("parent_id", "null");
  } else if (params.parent_id !== undefined) {
    query.set("parent_id", params.parent_id);
  }
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function listCategoriesPublic(params: {
  page?: number;
  limit?: number;
  parent_id?: string | null;
} = {}) {
  const path = `/categories${categoriesQueryString({
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    parent_id: params.parent_id,
  })}`;
  const response = await apiFetch(path, defaultFetchInit);
  const envelope = await readEnvelope<CategoryListItem[]>(response);
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function getCategoryByIdPublic(id: string): Promise<CategoryDetail> {
  const response = await apiFetch(`/categories/${id}`, defaultFetchInit);
  const envelope = await readEnvelope<CategoryDetail>(response);
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

export async function listCategoryTreePublic(): Promise<CategoryTreeItem[]> {
  const response = await apiFetch("/categories/tree", defaultFetchInit);
  const envelope = await readEnvelope<CategoryTreeItem[]>(response);
  if (!envelope.data) {
    throw new Error("Unexpected API response format");
  }
  return envelope.data;
}

/** Tìm category theo slug (quét danh sách phẳng). */
export async function findCategoryBySlug(slug: string): Promise<CategoryDetail | null> {
  const normalizedSlug = decodeURIComponent(slug).trim().toLowerCase();
  const pageSize = 100;
  const maxPages = 20;

  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const items = await listCategoriesPublic({ page, limit: pageSize });
      const found = items.find((c) => c.slug.trim().toLowerCase() === normalizedSlug);
      if (found) {
        return getCategoryByIdPublic(found.id);
      }

      if (items.length < pageSize) {
        break;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function toCollectionCard(c: CategoryListItem): Collection {
  const image = c.image_url?.trim() ? c.image_url : PLACEHOLDER_IMAGE;
  return {
    id: c.id,
    title: c.name,
    cta: "Xem bộ sưu tập",
    slug: `/categories/${encodeURIComponent(c.slug)}`,
    image,
  };
}

/** Danh mục gốc (level 1) cho trang chủ — lỗi API trả mảng rỗng. */
export async function featuredCollectionsFromApi(): Promise<Collection[]> {
  try {
    const roots = await listCategoriesPublic({
      page: 1,
      limit: 50,
      parent_id: null,
    });
    return roots.filter((c) => c.level === 1 && c.is_active).map(toCollectionCard);
  } catch {
    return [];
  }
}

export type CategoryNavLink = {
  label: string;
  href: string;
};

/** Link ngắn cho Header (tối đa 4). */
export async function getCategoryNavLinks(max = 4): Promise<CategoryNavLink[]> {
  try {
    const roots = await listCategoriesPublic({
      page: 1,
      limit: 30,
      parent_id: null,
    });
    return roots
      .filter((c) => c.level === 1 && c.is_active)
      .slice(0, max)
      .map((c) => ({
        label: c.name,
        href: `/categories/${encodeURIComponent(c.slug)}`,
      }));
  } catch {
    return [];
  }
}
