import { getApiErrorMessage } from "@/lib/api-error";
import { withAuth } from "@/lib/http-client";

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

const defaultFetchInit: RequestInit = {
  next: { revalidate: 60 },
  headers: { "Content-Type": "application/json" },
};

export type ProductReviewStats = {
  average_rating: number;
  total_reviews: number;
  rating_distribution: Record<string, number>;
};

export type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  order_id: string;
  rating: number;
  content: string;
  media_urls: string[];
  status: string;
  is_verified_purchase: boolean;
  helpful_count: number;
  created_at: string;
  updated_at: string;
};

export async function getProductReviewStatsPublic(productId: string): Promise<ProductReviewStats> {
  const response = await fetch(`${API_URL}/products/${productId}/review-stats`, defaultFetchInit);
  const json = (await response.json()) as ApiEnvelope<ProductReviewStats>;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Không tải được thống kê đánh giá."));
  }
  if (!json.success || !json.data) {
    throw new Error("Unexpected API response format");
  }
  return json.data;
}

export async function listProductReviewsPublic(
  productId: string,
  params: { page?: number; limit?: number; sort?: "latest" | "rating" | "helpful" } = {},
): Promise<{ items: ProductReview[]; pagination: { page: number; limit: number; total: number } }> {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.sort) {
    query.set("sort", params.sort);
  }
  const response = await fetch(
    `${API_URL}/products/${productId}/reviews?${query.toString()}`,
    defaultFetchInit,
  );
  const json = (await response.json()) as ApiEnvelope<ProductReview[]>;
  if (!response.ok) {
    throw new Error(getApiErrorMessage(json, "Không tải được đánh giá."));
  }
  if (!json.success || !json.data || !json.pagination) {
    throw new Error("Unexpected API response format");
  }
  return { items: json.data, pagination: json.pagination };
}

export type CreateReviewPayload = {
  product_id: string;
  order_id: string;
  rating: number;
  content: string;
  media_urls?: string[];
};

export async function createMyReview(payload: CreateReviewPayload): Promise<ProductReview> {
  const json = await withAuth<ProductReview>("/reviews", {
    method: "POST",
    body: JSON.stringify({
      product_id: payload.product_id,
      order_id: payload.order_id,
      rating: payload.rating,
      content: payload.content,
      media_urls: payload.media_urls ?? [],
    }),
  });
  if (!json.success || !json.data) {
    throw new Error(json.message ?? "Không gửi được đánh giá.");
  }
  return json.data;
}

export async function likeReviewRequest(reviewId: string): Promise<{ liked: boolean }> {
  const json = await withAuth<{ liked: boolean }>(`/reviews/${reviewId}/like`, {
    method: "POST",
  });
  if (!json.success || json.data === undefined) {
    throw new Error(json.message ?? "Không thể ghi nhận hữu ích.");
  }
  return json.data;
}

export async function reportReviewRequest(
  reviewId: string,
  reason: "SPAM" | "OFFENSIVE" | "FAKE",
): Promise<void> {
  const json = await withAuth<{ reported: boolean }>(`/reviews/${reviewId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
  if (!json.success) {
    throw new Error(json.message ?? "Không gửi được báo cáo.");
  }
}
