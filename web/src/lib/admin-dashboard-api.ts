import { adminFetchEnvelope } from "@/lib/admin-api";

export type DashboardComparePreset = "YESTERDAY" | "LAST_WEEK_SAME_DAY" | "AVG_LAST_7_DAYS";
export type TrendStatus = "GOOD" | "NEUTRAL" | "BAD";

export type DashboardSummary = {
  generatedAt: string;
  today: {
    range: { from: string; to: string };
    metrics: { grossRevenue: number; paidOrders: number; aov: number; newCustomers: number };
  };
  compare: {
    preset: DashboardComparePreset;
    range: { from: string; to: string };
    metrics: { grossRevenue: number; paidOrders: number; aov: number };
  };
  trend: {
    revenueDeltaPercent: number;
    paidOrderDeltaPercent: number;
    aovDeltaPercent: number;
    revenueStatus: TrendStatus;
    paidOrderStatus: TrendStatus;
    aovStatus: TrendStatus;
  };
  issues: {
    pendingOrdersTooLong: number;
    returnsAwaitingInspection: number;
    refundsStuck: number;
    thresholds: {
      pendingOrdersHours: number;
      returnsHours: number;
      refundsHours: number;
    };
  };
  orderStatusBreakdown: Array<{ status: string; count: number }>;
  statusDonut: Array<{ status: string; count: number; percent: number }>;
  charts: {
    hourly: Array<{ hour: number; label: string; revenue: number; orders: number }>;
    revenue7d: Array<{ day: string; label: string; revenue: number; orders: number }>;
    sparkline: {
      revenue: number[];
      orders: number[];
      aov: number[];
      newCustomers: number[];
    };
  };
  actionQueue: Array<{ key: string; label: string; count: number; href: string }>;
  recentOrders: Array<{
    id: string;
    totalAmount: number;
    status: string;
    paymentStatus: string;
    createdAt: string;
  }>;
};

function toQueryString(compare: DashboardComparePreset) {
  const params = new URLSearchParams();
  params.set("compare", compare);
  return `?${params.toString()}`;
}

export async function getAdminDashboardSummary(compare: DashboardComparePreset) {
  const response = await adminFetchEnvelope<DashboardSummary>(
    `/admin/dashboard/summary${toQueryString(compare)}`,
  );
  if (!response.success || !response.data) {
    throw new Error(response.message ?? "Khong tai duoc du lieu dashboard.");
  }
  return response.data;
}
