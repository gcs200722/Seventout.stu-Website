"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { listProductsPublic, type ProductListItem } from "@/lib/products-api";
import {
  adjustAdminInventory,
  getAdminProductInventory,
  listAdminInventory,
  listAdminInventoryMovements,
  syncAdminInventory,
  type AdminInventoryMovement,
  type AdminInventoryRow,
  type AdminProductInventoryResponse,
  type InventoryChannel,
} from "@/lib/inventory-api";

const PAGE_LIMIT = 10;

function canReadInventory(role: string | null, permissions: string[]) {
  return role === "ADMIN" || permissions.includes("INVENTORY_READ");
}

function canManageInventory(role: string | null, permissions: string[]) {
  return role === "ADMIN" || permissions.includes("INVENTORY_MANAGE");
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "—";
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString("vi-VN");
}

export default function AdminInventoryPage() {
  const { role, permissions } = useAuth();
  const readAllowed = useMemo(() => canReadInventory(role, permissions), [role, permissions]);
  const manageAllowed = useMemo(() => canManageInventory(role, permissions), [role, permissions]);

  const [products, setProducts] = useState<ProductListItem[]>([]);

  const [listRows, setListRows] = useState<AdminInventoryRow[]>([]);
  const [listPage, setListPage] = useState(1);
  const [listTotal, setListTotal] = useState(0);
  const [listChannel, setListChannel] = useState<"" | InventoryChannel>("");
  const [listLowStock, setListLowStock] = useState(false);
  const [listProductId, setListProductId] = useState("");

  const [detail, setDetail] = useState<AdminProductInventoryResponse | null>(null);

  const [movements, setMovements] = useState<AdminInventoryMovement[]>([]);
  const [movPage, setMovPage] = useState(1);
  const [movTotal, setMovTotal] = useState(0);
  const [movProductId, setMovProductId] = useState("");

  const [adjustProductId, setAdjustProductId] = useState("");
  const [adjustChannel, setAdjustChannel] = useState<InventoryChannel>("internal");
  const [adjustType, setAdjustType] = useState<"IN" | "OUT">("IN");
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustReason, setAdjustReason] = useState("");

  const [syncProductId, setSyncProductId] = useState("");
  const [syncChannel, setSyncChannel] = useState<"shopee" | "tiktok">("shopee");

  const [loading, setLoading] = useState(true);
  const [movLoading, setMovLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const productOptions = useMemo(() => {
    const mapped = new Map<string, string>();
    for (const product of products) {
      mapped.set(product.id, product.name);
    }
    for (const row of listRows) {
      if (!mapped.has(row.product_id)) {
        mapped.set(row.product_id, row.product_name);
      }
    }
    return Array.from(mapped.entries()).map(([id, name]) => ({ id, name }));
  }, [products, listRows]);

  const loadList = useCallback(async () => {
    if (!readAllowed) {
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, pagination } = await listAdminInventory({
        page: listPage,
        limit: PAGE_LIMIT,
        channel: listChannel || undefined,
        low_stock: listLowStock || undefined,
        product_id: listProductId.trim() || undefined,
      });
      setListRows(data);
      setListTotal(pagination.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được tồn kho.");
    } finally {
      setLoading(false);
    }
  }, [readAllowed, listPage, listChannel, listLowStock, listProductId]);

  const loadMovements = useCallback(async () => {
    if (!readAllowed) {
      return;
    }
    try {
      setMovLoading(true);
      setError(null);
      const { data, pagination } = await listAdminInventoryMovements({
        page: movPage,
        limit: PAGE_LIMIT,
        product_id: movProductId.trim() || undefined,
      });
      setMovements(data);
      setMovTotal(pagination.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được lịch sử biến động.");
    } finally {
      setMovLoading(false);
    }
  }, [readAllowed, movPage, movProductId]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const response = await listProductsPublic({
          page: 1,
          limit: 100,
          sort: "newest",
          is_active: true,
        });
        setProducts(response.items);
      } catch (requestError) {
        setProducts([]);
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Không tải được danh sách sản phẩm.",
        );
      }
    }
    void loadProducts();
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  async function handleAdjust() {
    if (!manageAllowed || !adjustProductId.trim()) {
      return;
    }
    const qty = Number.parseInt(adjustQty, 10);
    if (!Number.isFinite(qty) || qty < 1) {
      setError("Số lượng không hợp lệ.");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      const message = await adjustAdminInventory(adjustProductId.trim(), {
        channel: adjustChannel,
        type: adjustType,
        quantity: qty,
        reason: adjustReason.trim() || "Điều chỉnh từ admin",
      });
      setSuccessMessage(message);
      await loadList();
      await loadMovements();
      if (detail?.product_id === adjustProductId.trim()) {
        const refreshed = await getAdminProductInventory(adjustProductId.trim());
        setDetail(refreshed);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Điều chỉnh thất bại.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSync() {
    if (!manageAllowed || !syncProductId.trim()) {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      const message = await syncAdminInventory({
        product_id: syncProductId.trim(),
        channel: syncChannel,
      });
      setSuccessMessage(message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Đồng bộ thất bại.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!readAllowed) {
    return (
      <section className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold">Tồn kho</h1>
          <p className="mt-1 text-sm text-stone-600">
            Tài khoản cần quyền <code className="rounded bg-stone-100 px-1">INVENTORY_READ</code> (hoặc vai trò ADMIN) để
            xem tồn kho. Liên hệ quản trị để được cấp quyền.
          </p>
        </header>
      </section>
    );
  }

  const listPages = Math.max(1, Math.ceil(listTotal / PAGE_LIMIT));
  const movPages = Math.max(1, Math.ceil(movTotal / PAGE_LIMIT));

  return (
    <section className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Tồn kho đa kênh</h1>
        <p className="mt-1 text-sm text-stone-600">
          Dữ liệu từ API module Inventory; thao tác ghi yêu cầu quyền <code className="rounded bg-stone-100 px-1">INVENTORY_MANAGE</code>{" "}
          (ADMIN luôn được phép trên server).
        </p>
      </header>

      {error ? (
        <div className="whitespace-pre-wrap rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{successMessage}</div>
      ) : null}

      <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900">Danh sách tồn kho</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
            Kênh
            <select
              value={listChannel}
              onChange={(e) => {
                setListPage(1);
                setListChannel(e.target.value as "" | InventoryChannel);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900"
            >
              <option value="">Tất cả</option>
              <option value="internal">internal</option>
              <option value="shopee">shopee</option>
              <option value="tiktok">tiktok</option>
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={listLowStock}
              onChange={(e) => {
                setListPage(1);
                setListLowStock(e.target.checked);
              }}
            />
            Chỉ low stock
          </label>
          <label className="flex min-w-[240px] flex-1 flex-col gap-1 text-xs font-medium text-stone-600">
            Tồn kho theo sản phẩm
            <select
              value={listProductId}
              onChange={(e) => {
                setListPage(1);
                setListProductId(e.target.value);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">Tất cả sản phẩm</option>
              {productOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void loadList()}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800"
          >
            Áp dụng
          </button>
        </div>

        {loading ? <p className="mt-4 text-sm text-stone-500">Đang tải...</p> : null}

        {!loading ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-600">
                <tr>
                  <th className="px-3 py-2">Sản phẩm</th>
                  <th className="px-3 py-2">Kênh</th>
                  <th className="px-3 py-2">Có sẵn</th>
                  <th className="px-3 py-2">Đã giữ</th>
                  <th className="px-3 py-2">Cập nhật</th>
                </tr>
              </thead>
              <tbody>
                {listRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-stone-500">
                      Không có bản ghi.
                    </td>
                  </tr>
                ) : (
                  listRows.map((row) => (
                    <tr key={`${row.product_id}-${row.channel}`} className="border-b border-stone-100">
                      <td className="px-3 py-2">
                        <div className="font-medium text-stone-900">{row.product_name}</div>
                        <div className="text-xs text-stone-500">{row.product_id}</div>
                      </td>
                      <td className="px-3 py-2">{row.channel}</td>
                      <td className="px-3 py-2">{row.available_stock}</td>
                      <td className="px-3 py-2">{row.reserved_stock}</td>
                      <td className="px-3 py-2 text-xs text-stone-600">{formatDate(row.updated_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
          <span>
            Trang {listPage} / {listPages} — tổng {listTotal} bản ghi
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={listPage <= 1}
              onClick={() => setListPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={listPage >= listPages}
              onClick={() => setListPage((p) => p + 1)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>


      <div className="rounded-2xl border border-stone-200 bg-stone-50/50 p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-stone-900">Lịch sử biến động</h2>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="flex min-w-[200px] flex-col gap-1 text-xs font-medium text-stone-600">
            product_id (tùy chọn)
            <input
              value={movProductId}
              onChange={(e) => {
                setMovPage(1);
                setMovProductId(e.target.value);
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => void loadMovements()}
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 hover:bg-stone-50"
          >
            Làm mới
          </button>
        </div>
        {movLoading ? <p className="mt-4 text-sm text-stone-500">Đang tải...</p> : null}
        {!movLoading ? (
          <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-600">
                <tr>
                  <th className="px-3 py-2">Thời điểm</th>
                  <th className="px-3 py-2">Loại</th>
                  <th className="px-3 py-2">Kênh</th>
                  <th className="px-3 py-2">SL</th>
                  <th className="px-3 py-2">Trước → Sau</th>
                  <th className="px-3 py-2">Lý do</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-stone-500">
                      Chưa có biến động.
                    </td>
                  </tr>
                ) : (
                  movements.map((m) => (
                    <tr key={m.id} className="border-b border-stone-100">
                      <td className="px-3 py-2 text-xs">{formatDate(m.createdAt)}</td>
                      <td className="px-3 py-2">{m.type}</td>
                      <td className="px-3 py-2">{m.channel}</td>
                      <td className="px-3 py-2">{m.quantity}</td>
                      <td className="px-3 py-2">
                        {m.beforeStock} → {m.afterStock}
                      </td>
                      <td className="px-3 py-2 text-stone-600">{m.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
          <span>
            Trang {movPage} / {movPages} — tổng {movTotal}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={movPage <= 1}
              onClick={() => setMovPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={movPage >= movPages}
              onClick={() => setMovPage((p) => p + 1)}
              className="rounded-lg border border-stone-300 px-3 py-1.5 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      </div>

      {manageAllowed ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-stone-900">Điều chỉnh tồn kho</h2>
            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Sản phẩm
                <select
                  value={adjustProductId}
                  onChange={(e) => setAdjustProductId(e.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="">— Chọn —</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Kênh
                <select
                  value={adjustChannel}
                  onChange={(e) => setAdjustChannel(e.target.value as InventoryChannel)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="internal">internal</option>
                  <option value="shopee">shopee</option>
                  <option value="tiktok">tiktok</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Loại
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as "IN" | "OUT")}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="IN">IN</option>
                  <option value="OUT">OUT</option>
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Số lượng
                <input
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  type="number"
                  min={1}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Lý do
                <input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                />
              </label>
              <button
                type="button"
                disabled={actionLoading || !adjustProductId}
                onClick={() => void handleAdjust()}
                className="w-full rounded-lg bg-stone-900 py-2.5 text-sm font-medium text-white hover:bg-stone-800 disabled:opacity-40"
              >
                {actionLoading ? "Đang xử lý..." : "Áp dụng điều chỉnh"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-stone-900">Đồng bộ lên kênh</h2>
            <p className="mt-1 text-xs text-stone-500">
              API yêu cầu mapping sản phẩm–kênh; job được xếp hàng trên server.
            </p>
            <div className="mt-4 space-y-3">
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Sản phẩm
                <select
                  value={syncProductId}
                  onChange={(e) => setSyncProductId(e.target.value)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="">— Chọn —</option>
                  {productOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs font-medium text-stone-600">
                Kênh đích
                <select
                  value={syncChannel}
                  onChange={(e) => setSyncChannel(e.target.value as "shopee" | "tiktok")}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                >
                  <option value="shopee">Shopee</option>
                  <option value="tiktok">TikTok</option>
                </select>
              </label>
              <button
                type="button"
                disabled={actionLoading || !syncProductId}
                onClick={() => void handleSync()}
                className="w-full rounded-lg border border-stone-800 py-2.5 text-sm font-medium text-stone-900 hover:bg-stone-50 disabled:opacity-40"
              >
                {actionLoading ? "Đang xử lý..." : "Gửi đồng bộ"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-sm text-stone-600">
          Bạn chỉ có quyền xem. Điều chỉnh / đồng bộ cần quyền <code className="rounded bg-stone-100 px-1">INVENTORY_MANAGE</code>.
        </p>
      )}
    </section>
  );
}
