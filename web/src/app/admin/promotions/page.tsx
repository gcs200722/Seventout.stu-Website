"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/tenant/core/auth/AuthProvider";
import { getAdminProducts, type AdminProduct } from "@/lib/admin-api";
import { listCategoriesPublic, type CategoryListItem } from "@/lib/categories-api";
import {
  addAdminPromotionRule,
  createAdminCoupon,
  createAdminPromotionCampaign,
  deleteAdminCoupon,
  deleteAdminPromotionCampaign,
  deleteAdminPromotionRule,
  listAdminCoupons,
  listAdminPromotionCampaigns,
  type AdminCoupon,
  type AdminPromotionCampaign,
  type AdminPromotionRule,
} from "@/lib/admin-promotions-api";

const COUPON_TYPES = ["PERCENT", "FIXED", "SHIPPING"] as const;
const CAMPAIGN_TYPES = ["AUTO", "CODE_BASED"] as const;
const DISCOUNT_TYPES = ["PERCENT", "FIXED"] as const;

function canPromotionRead(role: string | null | undefined, permissions: string[]) {
  return role === "ADMIN" || permissions.includes("PROMOTION_READ");
}

function canPromotionManage(role: string | null | undefined, permissions: string[]) {
  return role === "ADMIN" || permissions.includes("PROMOTION_MANAGE");
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "—";
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("vi-VN");
}

const DATE_INPUT_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Giá trị mặc định cho `<input type="date">` (YYYY-MM-DD, theo giờ local). */
function todayDateInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Ngày đã chọn (YYYY-MM-DD) → ISO gửi API (`@IsDateString`, timestamptz). */
function dateInputToStartDateIso(dateYmd: string): string {
  const trimmed = dateYmd.trim();
  if (!DATE_INPUT_RE.test(trimmed)) {
    return `${todayDateInputValue()}T00:00:00.000Z`;
  }
  return `${trimmed}T00:00:00.000Z`;
}

/** API giới hạn `limit` tối đa 100 — gom nhiều trang để đủ dropdown. */
const CATALOG_PAGE_SIZE = 100;
const CATALOG_MAX_PAGES = 15;

async function fetchAllAdminProductsForRulePicker(): Promise<AdminProduct[]> {
  const all: AdminProduct[] = [];
  for (let page = 1; page <= CATALOG_MAX_PAGES; page += 1) {
    const batch = await getAdminProducts({
      page,
      limit: CATALOG_PAGE_SIZE,
      is_active: true,
    });
    all.push(...batch);
    if (batch.length < CATALOG_PAGE_SIZE) {
      break;
    }
  }
  return all;
}

async function fetchAllCategoriesForRulePicker(): Promise<CategoryListItem[]> {
  const all: CategoryListItem[] = [];
  for (let page = 1; page <= CATALOG_MAX_PAGES; page += 1) {
    const batch = await listCategoriesPublic({ page, limit: CATALOG_PAGE_SIZE });
    all.push(...batch);
    if (batch.length < CATALOG_PAGE_SIZE) {
      break;
    }
  }
  return all;
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids.map((s) => s.trim()).filter(Boolean))];
}

function buildRuleConditionFromForm(input: {
  minOrderValue: string;
  minQuantity: string;
  productIds: string[];
  categoryIds: string[];
}): Record<string, unknown> {
  const c: Record<string, unknown> = {};
  const mov = input.minOrderValue.trim();
  if (mov !== "") {
    const n = Number(mov);
    if (Number.isNaN(n) || n < 0) {
      throw new Error("Giá trị đơn tối thiểu (VND) không hợp lệ.");
    }
    c.min_order_value = Math.floor(n);
  }
  const mq = input.minQuantity.trim();
  if (mq !== "") {
    const n = Number(mq);
    if (Number.isNaN(n) || n < 1) {
      throw new Error("Số lượng tối thiểu phải là số nguyên ≥ 1.");
    }
    c.min_quantity = Math.floor(n);
  }
  const pids = uniqueIds(input.productIds);
  if (pids.length > 0) {
    c.product_ids = pids;
  }
  const cids = uniqueIds(input.categoryIds);
  if (cids.length > 0) {
    c.category_ids = cids;
  }
  return c;
}

function buildRuleActionFromForm(input: {
  discountType: string;
  value: string;
  maxDiscount: string;
}): Record<string, unknown> {
  const v = Number(input.value);
  if (Number.isNaN(v) || v < 0) {
    throw new Error("Giá trị giảm (%) hoặc số tiền không hợp lệ.");
  }
  const action: Record<string, unknown> = {
    discount_type: input.discountType,
    value: v,
  };
  const md = input.maxDiscount.trim();
  if (md !== "") {
    const n = Number(md);
    if (Number.isNaN(n) || n < 0) {
      throw new Error("Mức giảm tối đa không hợp lệ.");
    }
    action.max_discount = Math.floor(n);
  }
  return action;
}

function summarizeRuleCondition(cond: Record<string, unknown>): string {
  const parts: string[] = [];
  if (typeof cond.min_order_value === "number") {
    parts.push(`đơn tối thiểu ${cond.min_order_value.toLocaleString("vi-VN")}₫`);
  }
  if (typeof cond.min_quantity === "number") {
    parts.push(`SL tối thiểu ${cond.min_quantity}`);
  }
  if (Array.isArray(cond.product_ids) && cond.product_ids.length > 0) {
    parts.push(`${cond.product_ids.length} sản phẩm`);
  }
  if (Array.isArray(cond.category_ids) && cond.category_ids.length > 0) {
    parts.push(`${cond.category_ids.length} danh mục`);
  }
  return parts.length > 0 ? parts.join(" · ") : "Không ràng buộc (áp mọi dòng phù hợp engine)";
}

function summarizeRuleAction(act: Record<string, unknown>): string {
  const dt = act.discount_type != null ? String(act.discount_type) : "?";
  const v = act.value != null ? String(act.value) : "?";
  let s = `${dt} · ${v}`;
  if (act.max_discount != null && act.max_discount !== "") {
    s += ` · tối đa ${String(act.max_discount)}`;
  }
  return s;
}

export default function AdminPromotionsPage() {
  const { role, permissions } = useAuth();
  const permList = permissions ?? [];
  const readOk = useMemo(() => canPromotionRead(role, permList), [role, permList]);
  const manageOk = useMemo(() => canPromotionManage(role, permList), [role, permList]);

  const [tab, setTab] = useState<"coupons" | "campaigns">("coupons");
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [campaigns, setCampaigns] = useState<AdminPromotionCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<string>("PERCENT");
  const [newCouponValue, setNewCouponValue] = useState("10000");
  const [newCouponStart, setNewCouponStart] = useState(() => todayDateInputValue());

  const [newCampaignName, setNewCampaignName] = useState("");
  const [newCampaignType, setNewCampaignType] = useState<string>("AUTO");
  const [newCampaignDiscountType, setNewCampaignDiscountType] = useState<string>("PERCENT");
  const [newCampaignValue, setNewCampaignValue] = useState("5");
  const [newCampaignStart, setNewCampaignStart] = useState(() => todayDateInputValue());

  const [ruleCampaignId, setRuleCampaignId] = useState("");
  const [ruleConditionMinOrder, setRuleConditionMinOrder] = useState("");
  const [ruleConditionMinQty, setRuleConditionMinQty] = useState("");
  const [ruleSelectedProductIds, setRuleSelectedProductIds] = useState<string[]>([]);
  const [ruleSelectedCategoryIds, setRuleSelectedCategoryIds] = useState<string[]>([]);
  const [productOptions, setProductOptions] = useState<AdminProduct[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<CategoryListItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [ruleActionDiscountType, setRuleActionDiscountType] = useState<string>("PERCENT");
  const [ruleActionValue, setRuleActionValue] = useState("5");
  const [ruleActionMaxDiscount, setRuleActionMaxDiscount] = useState("");

  const loadAll = useCallback(async () => {
    if (!readOk) {
      setCoupons([]);
      setCampaigns([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [couponRows, campaignRows] = await Promise.all([listAdminCoupons(), listAdminPromotionCampaigns()]);
      setCoupons(couponRows);
      setCampaigns(campaignRows);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được dữ liệu khuyến mãi.");
    } finally {
      setLoading(false);
    }
  }, [readOk]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!readOk || tab !== "campaigns") {
      return;
    }
    let cancelled = false;
    setCatalogError(null);
    void (async () => {
      setCatalogLoading(true);
      const settled = await Promise.allSettled([
        fetchAllAdminProductsForRulePicker(),
        fetchAllCategoriesForRulePicker(),
      ]);
      if (cancelled) {
        return;
      }
      const productsResult = settled[0];
      const categoriesResult = settled[1];
      const products = productsResult.status === "fulfilled" ? productsResult.value : [];
      const categories = categoriesResult.status === "fulfilled" ? categoriesResult.value : [];
      setProductOptions(products);
      setCategoryOptions(categories);
      const hints: string[] = [];
      if (productsResult.status === "rejected") {
        const msg =
          productsResult.reason instanceof Error
            ? productsResult.reason.message
            : String(productsResult.reason);
        hints.push(`Sản phẩm: ${msg}`);
      }
      if (categoriesResult.status === "rejected") {
        const msg =
          categoriesResult.reason instanceof Error
            ? categoriesResult.reason.message
            : String(categoriesResult.reason);
        hints.push(`Danh mục: ${msg}`);
      }
      setCatalogError(hints.length > 0 ? hints.join(" ") : null);
      setCatalogLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [readOk, tab]);

  async function handleCreateCoupon() {
    if (!manageOk || !newCouponCode.trim()) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createAdminCoupon({
        code: newCouponCode.trim().toUpperCase(),
        type: newCouponType,
        value: Number(newCouponValue) || 0,
        start_date: dateInputToStartDateIso(newCouponStart),
        is_active: true,
      });
      setNewCouponCode("");
      setSuccess("Đã tạo coupon.");
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tạo được coupon.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteCoupon(id: string) {
    if (!manageOk || !window.confirm("Xóa coupon này?")) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteAdminCoupon(id);
      setSuccess("Đã xóa coupon.");
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không xóa được coupon.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateCampaign() {
    if (!manageOk || !newCampaignName.trim()) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await createAdminPromotionCampaign({
        name: newCampaignName.trim(),
        type: newCampaignType,
        discount_type: newCampaignDiscountType,
        value: Number(newCampaignValue) || 0,
        start_date: dateInputToStartDateIso(newCampaignStart),
        is_active: true,
      });
      setNewCampaignName("");
      setSuccess("Đã tạo chiến dịch.");
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tạo được chiến dịch.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteCampaign(id: string) {
    if (!manageOk || !window.confirm("Xóa chiến dịch này?")) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteAdminPromotionCampaign(id);
      setSuccess("Đã xóa chiến dịch.");
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không xóa được chiến dịch.");
    } finally {
      setActionLoading(false);
    }
  }

  function resetRuleForm() {
    setRuleConditionMinOrder("");
    setRuleConditionMinQty("");
    setRuleSelectedProductIds([]);
    setRuleSelectedCategoryIds([]);
    setRuleActionDiscountType("PERCENT");
    setRuleActionValue("5");
    setRuleActionMaxDiscount("");
  }

  async function handleAddRule() {
    if (!manageOk || !ruleCampaignId) {
      setError("Chọn chiến dịch để thêm rule.");
      return;
    }
    let condition: Record<string, unknown>;
    let action: Record<string, unknown>;
    try {
      condition = buildRuleConditionFromForm({
        minOrderValue: ruleConditionMinOrder,
        minQuantity: ruleConditionMinQty,
        productIds: ruleSelectedProductIds,
        categoryIds: ruleSelectedCategoryIds,
      });
      action = buildRuleActionFromForm({
        discountType: ruleActionDiscountType,
        value: ruleActionValue,
        maxDiscount: ruleActionMaxDiscount,
      });
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Dữ liệu rule không hợp lệ.");
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await addAdminPromotionRule(ruleCampaignId, { condition, action });
      setSuccess("Đã thêm quy tắc.");
      resetRuleForm();
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thêm được rule.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!manageOk || !window.confirm("Xóa rule này?")) {
      return;
    }
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      await deleteAdminPromotionRule(ruleId);
      setSuccess("Đã xóa rule.");
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không xóa được rule.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!readOk) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold text-stone-900">Khuyến mãi</h1>
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Bạn cần quyền PROMOTION_READ (hoặc ADMIN) để xem trang này.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-stone-900">Khuyến mãi</h1>
        <p className="mt-1 text-sm text-stone-600">
          Quản lý coupon và chiến dịch tự động. PROMOTION_READ để xem, PROMOTION_MANAGE để tạo/sửa/xóa.
        </p>
      </header>

      {error ? (
        <p className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>
      ) : null}

      <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setTab("coupons")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            tab === "coupons" ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-700 hover:bg-stone-50"
          }`}
        >
          Coupons
        </button>
        <button
          type="button"
          onClick={() => setTab("campaigns")}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
            tab === "campaigns" ? "bg-stone-900 text-white" : "border border-stone-300 text-stone-700 hover:bg-stone-50"
          }`}
        >
          Campaigns
        </button>
        <button
          type="button"
          disabled={loading || actionLoading}
          onClick={() => void loadAll()}
          className="ml-auto rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 disabled:opacity-50"
        >
          Tải lại
        </button>
      </div>

      {loading ? <p className="text-sm text-stone-500">Đang tải...</p> : null}

      {tab === "coupons" && !loading ? (
        <div className="space-y-4">
          {manageOk ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">Tạo coupon</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="text-xs font-medium text-stone-700">
                  Mã
                  <input
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                    placeholder="WELCOME10"
                  />
                </label>
                <label className="text-xs font-medium text-stone-700">
                  Loại
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                  >
                    {COUPON_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-stone-700">
                  Giá trị (VND hoặc % tuỳ loại)
                  <input
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-stone-700">
                  Ngày bắt đầu
                  <input
                    type="date"
                    value={newCouponStart}
                    onChange={(e) => setNewCouponStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleCreateCoupon()}
                className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
              >
                Tạo coupon
              </button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border border-stone-200">
            <table className="min-w-full text-left text-xs text-stone-700">
              <thead className="bg-stone-100 text-[11px] font-semibold uppercase text-stone-600">
                <tr>
                  <th className="px-3 py-2">Mã</th>
                  <th className="px-3 py-2">Loại</th>
                  <th className="px-3 py-2">Giá trị</th>
                  <th className="px-3 py-2">Active</th>
                  <th className="px-3 py-2">Bắt đầu</th>
                  {manageOk ? <th className="px-3 py-2"> </th> : null}
                </tr>
              </thead>
              <tbody>
                {coupons.map((c) => (
                  <tr key={c.id} className="border-t border-stone-200">
                    <td className="px-3 py-2 font-mono text-stone-900">{c.code}</td>
                    <td className="px-3 py-2">{c.type}</td>
                    <td className="px-3 py-2">{c.value}</td>
                    <td className="px-3 py-2">{c.isActive ? "Có" : "Không"}</td>
                    <td className="px-3 py-2">{formatDate(c.startDate)}</td>
                    {manageOk ? (
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => void handleDeleteCoupon(c.id)}
                          className="text-rose-600 hover:underline disabled:opacity-50"
                        >
                          Xóa
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
            {coupons.length === 0 ? <p className="p-4 text-sm text-stone-500">Chưa có coupon.</p> : null}
          </div>
        </div>
      ) : null}

      {tab === "campaigns" && !loading ? (
        <div className="space-y-4">
          {manageOk ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
              <h2 className="text-sm font-semibold text-stone-900">Tạo chiến dịch</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="text-xs font-medium text-stone-700">
                  Tên
                  <input
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-stone-700">
                  Loại campaign
                  <select
                    value={newCampaignType}
                    onChange={(e) => setNewCampaignType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                  >
                    {CAMPAIGN_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-stone-700">
                  Loại giảm
                  <select
                    value={newCampaignDiscountType}
                    onChange={(e) => setNewCampaignDiscountType(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                  >
                    {DISCOUNT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-xs font-medium text-stone-700">
                  Giá trị
                  <input
                    value={newCampaignValue}
                    onChange={(e) => setNewCampaignValue(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs font-medium text-stone-700 sm:col-span-2">
                  Ngày bắt đầu
                  <input
                    type="date"
                    value={newCampaignStart}
                    onChange={(e) => setNewCampaignStart(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleCreateCampaign()}
                className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
              >
                Tạo chiến dịch
              </button>
            </div>
          ) : null}

          <div className="space-y-4">
            {campaigns.map((camp) => (
              <article key={camp.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold text-stone-900">{camp.name}</h3>
                    <p className="mt-1 text-xs text-stone-600">
                      {camp.type} · {camp.discountType} · {camp.value}
                      {camp.maxDiscount != null ? ` · max ${camp.maxDiscount}` : ""} · ưu tiên {camp.priority}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {formatDate(camp.startDate)}
                      {camp.endDate ? ` → ${formatDate(camp.endDate)}` : ""} · {camp.isActive ? "active" : "tắt"}
                    </p>
                  </div>
                  {manageOk ? (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={() => void handleDeleteCampaign(camp.id)}
                      className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
                    >
                      Xóa chiến dịch
                    </button>
                  ) : null}
                </div>
                {camp.rules && camp.rules.length > 0 ? (
                  <ul className="mt-3 space-y-2 border-t border-stone-100 pt-3 text-xs">
                    {camp.rules.map((rule: AdminPromotionRule) => (
                      <li key={rule.id} className="flex flex-wrap items-start justify-between gap-2 rounded-lg bg-stone-50 p-2">
                        <div className="text-[11px] text-stone-700">
                          <div>
                            <span className="font-semibold text-stone-800">Điều kiện:</span>{" "}
                            {summarizeRuleCondition(rule.condition as Record<string, unknown>)}
                          </div>
                          <div className="mt-0.5">
                            <span className="font-semibold text-stone-800">Hành động:</span>{" "}
                            {summarizeRuleAction(rule.action as Record<string, unknown>)}
                          </div>
                        </div>
                        {manageOk ? (
                          <button
                            type="button"
                            disabled={actionLoading}
                            onClick={() => void handleDeleteRule(rule.id)}
                            className="shrink-0 text-rose-600 hover:underline disabled:opacity-50"
                          >
                            Xóa rule
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-stone-500">Chưa có quy tắc.</p>
                )}
              </article>
            ))}
            {campaigns.length === 0 ? <p className="text-sm text-stone-500">Chưa có chiến dịch.</p> : null}
          </div>

          {manageOk ? (
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-4">
              <h2 className="text-sm font-semibold text-stone-900">Thêm quy tắc cho chiến dịch</h2>
              <label className="block text-xs font-medium text-stone-700">
                Chiến dịch
                <select
                  value={ruleCampaignId}
                  onChange={(e) => setRuleCampaignId(e.target.value)}
                  className="mt-1 w-full max-w-md rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
                >
                  <option value="">— chọn —</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="rounded-xl border border-stone-200 bg-white p-3 space-y-3">
                <legend className="px-1 text-xs font-semibold text-stone-800">Điều kiện</legend>
                <p className="text-[11px] text-stone-500">
                  Để trống toàn bộ = áp dụng rộng (theo engine). Có thể kết hợp nhiều trường.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-xs font-medium text-stone-700">
                    Giá trị đơn tối thiểu (VND)
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={ruleConditionMinOrder}
                      onChange={(e) => setRuleConditionMinOrder(e.target.value)}
                      placeholder="Ví dụ: 200000"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
                    />
                  </label>
                  <label className="text-xs font-medium text-stone-700">
                    Số lượng tối thiểu (cái)
                    <input
                      type="number"
                      min={1}
                      step={1}
                      value={ruleConditionMinQty}
                      onChange={(e) => setRuleConditionMinQty(e.target.value)}
                      placeholder="Ví dụ: 2"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-xs font-medium text-stone-700">Sản phẩm áp dụng</span>
                    <select
                      multiple
                      size={Math.min(10, Math.max(4, productOptions.length || 4))}
                      value={ruleSelectedProductIds}
                      onChange={(e) =>
                        setRuleSelectedProductIds(
                          Array.from(e.target.selectedOptions, (opt) => opt.value),
                        )
                      }
                      disabled={catalogLoading || productOptions.length === 0}
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-1 py-1 text-sm text-stone-900 disabled:opacity-60"
                    >
                      {productOptions.map((p) => (
                        <option key={p.id} value={p.id} title={p.id}>
                          {p.name}
                          {p.category?.name ? ` · ${p.category.name}` : ""}
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                      <span>Giữ Ctrl (Windows) hoặc ⌘ (Mac) để chọn nhiều.</span>
                      {ruleSelectedProductIds.length > 0 ? (
                        <button
                          type="button"
                          className="font-semibold text-stone-700 underline"
                          onClick={() => setRuleSelectedProductIds([])}
                        >
                          Bỏ chọn SP
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-stone-700">Danh mục áp dụng</span>
                    <select
                      multiple
                      size={Math.min(10, Math.max(4, categoryOptions.length || 4))}
                      value={ruleSelectedCategoryIds}
                      onChange={(e) =>
                        setRuleSelectedCategoryIds(
                          Array.from(e.target.selectedOptions, (opt) => opt.value),
                        )
                      }
                      disabled={catalogLoading || categoryOptions.length === 0}
                      className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-1 py-1 text-sm text-stone-900 disabled:opacity-60"
                    >
                      {categoryOptions.map((cat) => (
                        <option key={cat.id} value={cat.id} title={cat.id}>
                          {cat.name} (cấp {cat.level})
                        </option>
                      ))}
                    </select>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                      <span>Giữ Ctrl (Windows) hoặc ⌘ (Mac) để chọn nhiều.</span>
                      {ruleSelectedCategoryIds.length > 0 ? (
                        <button
                          type="button"
                          className="font-semibold text-stone-700 underline"
                          onClick={() => setRuleSelectedCategoryIds([])}
                        >
                          Bỏ chọn DM
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {catalogLoading ? (
                  <p className="text-[11px] text-stone-500">Đang tải danh sách sản phẩm và danh mục…</p>
                ) : null}
                {catalogError ? <p className="text-[11px] text-amber-800">{catalogError}</p> : null}
              </fieldset>

              <fieldset className="rounded-xl border border-stone-200 bg-white p-3 space-y-3">
                <legend className="px-1 text-xs font-semibold text-stone-800">Hành động giảm giá</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-medium text-stone-700">
                    Loại giảm
                    <select
                      value={ruleActionDiscountType}
                      onChange={(e) => setRuleActionDiscountType(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
                    >
                      {DISCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t === "PERCENT" ? "Phần trăm (%)" : "Số tiền cố định (VND)"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-stone-700">
                    {ruleActionDiscountType === "PERCENT" ? "Phần trăm giảm" : "Số tiền giảm (VND)"}
                    <input
                      type="number"
                      min={0}
                      step={ruleActionDiscountType === "PERCENT" ? 1 : 1000}
                      value={ruleActionValue}
                      onChange={(e) => setRuleActionValue(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
                    />
                  </label>
                  <label className="text-xs font-medium text-stone-700">
                    Giảm tối đa (VND, tuỳ chọn)
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={ruleActionMaxDiscount}
                      onChange={(e) => setRuleActionMaxDiscount(e.target.value)}
                      placeholder="Áp dụng khi %"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-2 py-1.5 text-sm text-stone-900"
                    />
                  </label>
                </div>
              </fieldset>

              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleAddRule()}
                className="rounded-full bg-stone-900 px-4 py-2 text-xs font-semibold text-white hover:bg-stone-700 disabled:opacity-50"
              >
                Thêm quy tắc
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
