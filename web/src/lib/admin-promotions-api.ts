import { adminFetchEnvelope } from "@/lib/admin-api";

export type AdminCoupon = {
  id: string;
  code: string;
  type: string;
  value: number;
  minOrderValue: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  maxUsesPerUser: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminPromotionCampaign = {
  id: string;
  name: string;
  type: string;
  discountType: string;
  value: number;
  maxDiscount: number | null;
  priority: number;
  startDate: string;
  endDate: string | null;
  isActive: boolean;
  rules?: AdminPromotionRule[];
  createdAt: string;
  updatedAt: string;
};

export type AdminPromotionRule = {
  id: string;
  campaignId: string;
  condition: Record<string, unknown>;
  action: Record<string, unknown>;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export async function listAdminCoupons(): Promise<AdminCoupon[]> {
  const res = await adminFetchEnvelope<AdminCoupon[]>("/coupons");
  if (!res.data) {
    throw new Error("Unexpected API response: missing coupons");
  }
  return res.data;
}

export async function createAdminCoupon(payload: {
  code: string;
  type: string;
  value: number;
  min_order_value?: number;
  max_discount?: number | null;
  usage_limit?: number | null;
  max_uses_per_user?: number;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
}): Promise<AdminCoupon> {
  const res = await adminFetchEnvelope<AdminCoupon>("/coupons", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.data) {
    throw new Error("Unexpected API response: missing coupon");
  }
  return res.data;
}

export async function updateAdminCoupon(
  id: string,
  payload: Partial<{
    code: string;
    type: string;
    value: number;
    min_order_value: number;
    max_discount: number | null;
    usage_limit: number | null;
    max_uses_per_user: number;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
  }>,
): Promise<AdminCoupon> {
  const res = await adminFetchEnvelope<AdminCoupon>(`/coupons/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.data) {
    throw new Error("Unexpected API response: missing coupon");
  }
  return res.data;
}

export async function deleteAdminCoupon(id: string): Promise<string> {
  const res = await adminFetchEnvelope<unknown>(`/coupons/${id}`, {
    method: "DELETE",
  });
  return res.message ?? "Coupon deleted";
}

export async function listAdminPromotionCampaigns(): Promise<AdminPromotionCampaign[]> {
  const res = await adminFetchEnvelope<AdminPromotionCampaign[]>("/promotion-campaigns");
  if (!res.data) {
    throw new Error("Unexpected API response: missing campaigns");
  }
  return res.data;
}

export async function createAdminPromotionCampaign(payload: {
  name: string;
  type: string;
  discount_type: string;
  value: number;
  max_discount?: number | null;
  priority?: number;
  start_date: string;
  end_date?: string | null;
  is_active?: boolean;
}): Promise<AdminPromotionCampaign> {
  const res = await adminFetchEnvelope<AdminPromotionCampaign>("/promotion-campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.data) {
    throw new Error("Unexpected API response: missing campaign");
  }
  return res.data;
}

export async function updateAdminPromotionCampaign(
  id: string,
  payload: Partial<{
    name: string;
    type: string;
    discount_type: string;
    value: number;
    max_discount: number | null;
    priority: number;
    start_date: string;
    end_date: string | null;
    is_active: boolean;
  }>,
): Promise<AdminPromotionCampaign> {
  const res = await adminFetchEnvelope<AdminPromotionCampaign>(`/promotion-campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.data) {
    throw new Error("Unexpected API response: missing campaign");
  }
  return res.data;
}

export async function deleteAdminPromotionCampaign(id: string): Promise<string> {
  const res = await adminFetchEnvelope<unknown>(`/promotion-campaigns/${id}`, {
    method: "DELETE",
  });
  return res.message ?? "Campaign deleted";
}

export async function addAdminPromotionRule(
  campaignId: string,
  payload: {
    condition: Record<string, unknown>;
    action: Record<string, unknown>;
    sort_order?: number;
  },
): Promise<AdminPromotionRule> {
  const res = await adminFetchEnvelope<AdminPromotionRule>(`/promotion-campaigns/${campaignId}/rules`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.data) {
    throw new Error("Unexpected API response: missing rule");
  }
  return res.data;
}

export async function updateAdminPromotionRule(
  id: string,
  payload: Partial<{
    condition: Record<string, unknown>;
    action: Record<string, unknown>;
    sort_order: number;
  }>,
): Promise<AdminPromotionRule> {
  const res = await adminFetchEnvelope<AdminPromotionRule>(`/promotion-rules/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (!res.data) {
    throw new Error("Unexpected API response: missing rule");
  }
  return res.data;
}

export async function deleteAdminPromotionRule(id: string): Promise<string> {
  const res = await adminFetchEnvelope<unknown>(`/promotion-rules/${id}`, {
    method: "DELETE",
  });
  return res.message ?? "Rule deleted";
}
