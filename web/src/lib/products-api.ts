import { getApiErrorMessage } from "@/lib/api-error";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

export type ProductListItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  thumbnail: string;
  category: {
    id: string;
    name: string;
  };
  available_stock: number;
  is_active: boolean;
  created_at: string;
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
    parent: { id: string; name: string } | null;
  };
  available_stock: number;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  const response = await fetch(
    `${API_URL}/products${toQueryString({
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
  const response = await fetch(`${API_URL}/products/${id}`, defaultFetchInit);
  const json = (await response.json()) as ApiEnvelope<ProductDetail>;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Không tải được chi tiết sản phẩm."));
  }
  if (!json.success || !json.data) {
    throw new Error("Unexpected API response format");
  }
  return json.data;
}

export async function getProductStockPublic(id: string): Promise<ProductStock> {
  const response = await fetch(`${API_URL}/products/${id}/stock`, noStoreFetchInit);
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
  const response = await fetch(`${API_URL}/products/stocks?${query.toString()}`, noStoreFetchInit);
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
