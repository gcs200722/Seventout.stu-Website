import { getApiErrorMessage } from "@/lib/api-error";
import { apiFetch } from "@/lib/api-fetch";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
};

export type ProductStock = {
  product_id: string;
  available_stock: number;
};

/** Catalog promotion preview from API (snake_case). */
export type ProductPromotionPreview = {
  campaign_name: string;
  list_price: number;
  sale_price: number;
  conditions_display?: {
    min_quantity: number | null;
    min_order_value: number | null;
    scoped_to_products?: boolean;
    scoped_to_categories?: boolean;
  };
};

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail: string;
  category: {
    id: string;
    name: string;
    slug: string;
    parent: { id: string; name: string; slug: string } | null;
  };
  available_stock: number;
  is_active: boolean;
  created_at: string;
  promotion?: ProductPromotionPreview;
};

export type ProductDetail = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  category: {
    id: string;
    name: string;
    slug: string;
    parent: { id: string; name: string; slug: string } | null;
  };
  available_stock: number;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  promotion?: ProductPromotionPreview;
};

export type ProductSort = "price_asc" | "price_desc" | "newest";

export type ProductListQuery = {
  page?: number;
  limit?: number;
  category_id?: string;
  keyword?: string;
  min_price?: number;
  max_price?: number;
  is_active?: boolean;
  sort?: ProductSort;
};

const defaultFetchInit: RequestInit = {
  next: { revalidate: 60 },
  headers: { "Content-Type": "application/json" },
};

const noStoreFetchInit: RequestInit = {
  cache: "no-store",
  headers: { "Content-Type": "application/json" },
};

function toQueryString(params: ProductListQuery): string {
  const query = new URLSearchParams();
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.limit !== undefined) query.set("limit", String(params.limit));
  if (params.category_id) query.set("category_id", params.category_id);
  if (params.keyword) query.set("keyword", params.keyword);
  if (params.min_price !== undefined) query.set("min_price", String(params.min_price));
  if (params.max_price !== undefined) query.set("max_price", String(params.max_price));
  if (params.is_active !== undefined) query.set("is_active", String(params.is_active));
  if (params.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return qs.length > 0 ? `?${qs}` : "";
}

export async function listProductsPublic(
  params: ProductListQuery = {},
): Promise<{ items: ProductListItem[]; pagination: { page: number; limit: number; total: number } }> {
  const response = await apiFetch(
    `/products${toQueryString({
      page: params.page ?? 1,
      limit: params.limit ?? 12,
      category_id: params.category_id,
      keyword: params.keyword,
      min_price: params.min_price,
      max_price: params.max_price,
      is_active: params.is_active ?? true,
      sort: params.sort ?? "newest",
    })}`,
    defaultFetchInit,
  );

  const json = (await response.json()) as ApiEnvelope<ProductListItem[]>;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Không tải được danh sách sản phẩm."));
  }
  if (!json.success || !json.data || !json.pagination) {
    throw new Error("Unexpected API response format");
  }

  return {
    items: json.data,
    pagination: json.pagination,
  };
}

export async function getProductByIdPublic(id: string): Promise<ProductDetail> {
  const response = await apiFetch(`/products/${id}`, defaultFetchInit);
  const json = (await response.json()) as ApiEnvelope<ProductDetail>;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Không tải được chi tiết sản phẩm."));
  }
  if (!json.success || !json.data) {
    throw new Error("Unexpected API response format");
  }
  return json.data;
}

export async function getProductBySlugPublic(slug: string): Promise<ProductDetail> {
  const response = await apiFetch(`/products/slug/${encodeURIComponent(slug)}`, defaultFetchInit);
  const json = (await response.json()) as ApiEnvelope<ProductDetail>;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Không tải được chi tiết sản phẩm."));
  }
  if (!json.success || !json.data) {
    throw new Error("Unexpected API response format");
  }
  return json.data;
}

export async function getProductsByIdsPublic(ids: string[]): Promise<ProductDetail[]> {
  const unique = [...new Set(ids)].filter((id) => id && id.length > 0);
  if (unique.length === 0) {
    return [];
  }
  const response = await apiFetch(`/products/by-ids`, {
    ...defaultFetchInit,
    method: "POST",
    body: JSON.stringify({ ids: unique.slice(0, 48) }),
  });
  const json = (await response.json()) as ApiEnvelope<ProductDetail[]>;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Không tải được danh sách sản phẩm."));
  }
  if (!json.success || !json.data) {
    throw new Error("Unexpected API response format");
  }
  return json.data;
}

export async function getProductStockPublic(id: string): Promise<ProductStock> {
  const response = await apiFetch(`/products/${id}/stock`, noStoreFetchInit);
  const json = (await response.json()) as ApiEnvelope<ProductStock>;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Không tải được tồn kho sản phẩm."));
  }
  if (!json.success || !json.data) {
    throw new Error("Unexpected API response format");
  }
  return json.data;
}

export async function listProductStocksPublic(ids: string[]): Promise<ProductStock[]> {
  if (ids.length === 0) {
    return [];
  }
  const uniqueIds = [...new Set(ids)];
  const query = new URLSearchParams({ ids: uniqueIds.join(",") });
  const response = await apiFetch(`/products/stocks?${query.toString()}`, noStoreFetchInit);
  const json = (await response.json()) as ApiEnvelope<ProductStock[]>;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Không tải được tồn kho sản phẩm."));
  }
  if (!json.success || !json.data) {
    throw new Error("Unexpected API response format");
  }
  return json.data;
}

export function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildProductHref(product: {
  slug?: string;
  category?: { slug?: string; parent?: { slug?: string } | null } | null;
}): string {
  const parentSlug = product.category?.parent?.slug?.trim();
  const subCategorySlug = product.category?.slug?.trim();
  const productSlug = product.slug?.trim();
  if (!parentSlug || !subCategorySlug || !productSlug) {
    return "/products";
  }
  return `/categories/${encodeURIComponent(parentSlug)}/${encodeURIComponent(subCategorySlug)}/${encodeURIComponent(productSlug)}`;
}
