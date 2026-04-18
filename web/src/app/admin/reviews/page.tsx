"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listAdminReviews,
  moderateAdminReview,
  type AdminReviewRow,
  type ListAdminReviewsQuery,
} from "@/lib/admin-api";

const STATUS_OPTIONS: Array<{ value: ListAdminReviewsQuery["status"] | ""; label: string }> = [
  { value: "", label: "Tất cả" },
  { value: "PENDING", label: "Chờ duyệt" },
  { value: "APPROVED", label: "Đã duyệt" },
  { value: "HIDDEN", label: "Đã ẩn" },
  { value: "REJECTED", label: "Từ chối" },
];

export default function AdminReviewsPage() {
  const [items, setItems] = useState<AdminReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ListAdminReviewsQuery["status"] | "">("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await listAdminReviews({
        page: 1,
        limit: 50,
        status: statusFilter || undefined,
      });
      setItems(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được đánh giá.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(reviewId: string, status: NonNullable<ListAdminReviewsQuery["status"]>) {
    setBusyId(reviewId);
    setError(null);
    try {
      await moderateAdminReview(reviewId, status);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Cập nhật thất bại.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Đánh giá sản phẩm</h1>
        <p className="mt-1 text-sm text-stone-600">Duyệt, ẩn hoặc từ chối đánh giá từ khách hàng.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-stone-600">
          Trạng thái
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter((e.target.value || "") as ListAdminReviewsQuery["status"] | "")}
            className="ml-2 rounded-md border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.label} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {loading ? <p className="text-sm text-stone-500">Đang tải...</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-stone-500">Không có đánh giá nào.</p>
      ) : null}

      <ul className="space-y-3">
        {items.map((row) => (
          <li key={row.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="text-xs text-stone-500">
                  {row.id} · SP {row.product_id}
                </p>
                <p className="mt-1 text-sm font-semibold text-stone-900">
                  {row.rating} sao ·{" "}
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-stone-700">
                    {row.status}
                  </span>
                </p>
                <p className="mt-2 text-sm text-stone-800">{row.content}</p>
                <p className="mt-1 text-xs text-stone-500">
                  Hữu ích: {row.helpful_count} · {new Date(row.created_at).toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  disabled={busyId === row.id || row.status === "APPROVED"}
                  onClick={() => void setStatus(row.id, "APPROVED")}
                  className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-40"
                >
                  Duyệt
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id || row.status === "HIDDEN"}
                  onClick={() => void setStatus(row.id, "HIDDEN")}
                  className="rounded-md border border-stone-400 px-3 py-1.5 text-xs font-semibold text-stone-800 hover:bg-stone-100 disabled:opacity-40"
                >
                  Ẩn
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id || row.status === "REJECTED"}
                  onClick={() => void setStatus(row.id, "REJECTED")}
                  className="rounded-md border border-rose-300 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-40"
                >
                  Từ chối
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
