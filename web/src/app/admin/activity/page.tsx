"use client";

import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/components/tenant/core/auth/AuthProvider";
import {
  auditActionShortLabel,
  auditActorRoleLabel,
  auditEntityTypeLabel,
  auditMetadataActorEmail,
  auditMetadataEntityLabel,
  auditMetadataIp,
  auditMetadataSourceLabel,
  auditMetadataUserAgent,
  describeAuditLog,
  formatAuditDateTimeFull,
  formatAuditTableLine,
  formatUserAgentHint,
} from "@/lib/audit-log-messages";
import {
  getAdminAuditLogDetail,
  listAdminAuditLogs,
  type AdminAuditLogDetail,
  type AdminAuditLogRow,
  type ListAdminAuditLogsQuery,
} from "@/lib/admin-api";

export default function AdminActivityPage() {
  const { role, permissions } = useAuth();
  const canRead = role === "ADMIN" || permissions.includes("AUDIT_READ");

  const [items, setItems] = useState<AdminAuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionFilter, setActionFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [actorIdFilter, setActorIdFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [detail, setDetail] = useState<AdminAuditLogDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    if (!canRead) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const query: ListAdminAuditLogsQuery = {
      page,
      limit,
      action: actionFilter.trim() || undefined,
      entity_type: entityTypeFilter.trim() || undefined,
      actor_id: actorIdFilter.trim() || undefined,
      date_from: dateFrom.trim() || undefined,
      date_to: dateTo.trim() || undefined,
    };
    try {
      const { data, pagination } = await listAdminAuditLogs(query);
      setItems(data);
      setTotal(pagination.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được nhật ký.");
    } finally {
      setLoading(false);
    }
  }, [
    canRead,
    page,
    limit,
    actionFilter,
    entityTypeFilter,
    actorIdFilter,
    dateFrom,
    dateTo,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    setError(null);
    try {
      const row = await getAdminAuditLogDetail(id);
      setDetail(row);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  }

  if (!canRead) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-stone-900">Nhật ký hoạt động</h1>
        <p className="text-sm text-stone-600">
          Tài khoản của bạn không có quyền AUDIT_READ. Liên hệ quản trị viên nếu cần truy cập.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Nhật ký hoạt động</h1>
        <p className="mt-1 text-sm text-stone-600">
          Theo dõi hành động quan trọng: đăng nhập, thay đổi đơn hàng, người dùng, v.v.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        <label className="font-medium text-stone-600">
          Action
          <input
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            placeholder="LOGIN, CREATE…"
            className="ml-2 block w-36 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="font-medium text-stone-600">
          Entity
          <input
            value={entityTypeFilter}
            onChange={(e) => {
              setEntityTypeFilter(e.target.value);
              setPage(1);
            }}
            placeholder="ORDER, USER…"
            className="ml-2 block w-36 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="font-medium text-stone-600">
          Actor ID
          <input
            value={actorIdFilter}
            onChange={(e) => {
              setActorIdFilter(e.target.value);
              setPage(1);
            }}
            className="ml-2 block w-52 rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="font-medium text-stone-600">
          Từ ngày
          <input
            type="datetime-local"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="ml-2 block rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
        <label className="font-medium text-stone-600">
          Đến ngày
          <input
            type="datetime-local"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="ml-2 block rounded-md border border-stone-300 px-2 py-1.5 text-sm"
          />
        </label>
      </div>

      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      {loading ? <p className="text-sm text-stone-500">Đang tải...</p> : null}

      {!loading && items.length === 0 ? (
        <p className="text-sm text-stone-500">Không có bản ghi nào.</p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-stone-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-stone-50 text-xs font-semibold uppercase text-stone-500">
            <tr>
              <th className="px-3 py-2">Sự kiện</th>
              <th className="w-28 px-3 py-2 text-right" />
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id} className="border-t border-stone-100">
                <td className="px-3 py-2.5 text-sm text-stone-800">
                  <span className="leading-relaxed">{formatAuditTableLine(row)}</span>
                </td>
                <td className="px-3 py-2 text-right align-top">
                  <button
                    type="button"
                    onClick={() => void openDetail(row.id)}
                    className="rounded-md border border-stone-300 px-2 py-1 text-xs text-stone-700 hover:bg-stone-50"
                  >
                    Chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > limit ? (
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-stone-300 px-3 py-1 disabled:opacity-40"
          >
            Trước
          </button>
          <span className="text-stone-600">
            Trang {page} / {Math.max(1, Math.ceil(total / limit))}
          </span>
          <button
            type="button"
            disabled={page * limit >= total}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-md border border-stone-300 px-3 py-1 disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      ) : null}

      {detail || detailLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-semibold text-stone-900">Chi tiết nhật ký</h2>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-full border border-stone-300 px-2 py-1 text-xs"
              >
                Đóng
              </button>
            </div>
            {detailLoading ? <p className="mt-4 text-sm text-stone-500">Đang tải...</p> : null}
            {detail ? (
              <div className="mt-4 space-y-5 text-sm text-stone-800">
                <p className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-stone-700">
                  {describeAuditLog(detail)}
                </p>

                <dl className="space-y-3">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Người thực hiện
                    </dt>
                    <dd className="mt-0.5">
                      {detail.actor_role === "SYSTEM" || !detail.actor_id ? (
                        <span>{auditActorRoleLabel(detail.actor_role)}</span>
                      ) : (
                        <span>
                          {auditActorRoleLabel(detail.actor_role)}
                          {auditMetadataActorEmail(detail.metadata) ? (
                            <>
                              {" "}
                              <span className="text-stone-600">
                                ({auditMetadataActorEmail(detail.metadata)})
                              </span>
                            </>
                          ) : null}{" "}
                          <span className="text-stone-500">(ID: {detail.actor_id})</span>
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Hành động</dt>
                    <dd className="mt-0.5">{auditActionShortLabel(detail.action)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Đối tượng</dt>
                    <dd className="mt-0.5">
                      {auditEntityTypeLabel(detail.entity_type)}
                      {auditMetadataEntityLabel(detail.metadata) ? (
                        <span className="text-stone-700">
                          {" "}
                          · {auditMetadataEntityLabel(detail.metadata)}
                        </span>
                      ) : null}
                      {detail.entity_id ? (
                        <span className="text-stone-500"> · ID: {detail.entity_id}</span>
                      ) : null}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-stone-500">Thời gian</dt>
                    <dd className="mt-0.5">{formatAuditDateTimeFull(detail.created_at)}</dd>
                  </div>
                </dl>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Thông tin thêm</p>
                  <ul className="mt-2 list-inside list-disc space-y-1 text-stone-700">
                    <li>
                      IP: <span className="font-mono text-xs">{auditMetadataIp(detail.metadata) ?? "—"}</span>
                    </li>
                    <li>
                      Thiết bị:{" "}
                      {formatUserAgentHint(auditMetadataUserAgent(detail.metadata) ?? undefined)}
                    </li>
                    <li>Nguồn: {auditMetadataSourceLabel(detail.metadata)}</li>
                  </ul>
                </div>

                {(detail.before && Object.keys(detail.before).length > 0) ||
                (detail.after && Object.keys(detail.after).length > 0) ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                      Dữ liệu thay đổi
                    </p>
                    {detail.before && Object.keys(detail.before).length > 0 ? (
                      <div>
                        <p className="text-xs text-stone-600">Trước</p>
                        <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-amber-50/80 p-3 font-mono text-xs text-stone-800">
                          {JSON.stringify(detail.before, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                    {detail.after && Object.keys(detail.after).length > 0 ? (
                      <div>
                        <p className="text-xs text-stone-600">Sau</p>
                        <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-emerald-50/80 p-3 font-mono text-xs text-stone-800">
                          {JSON.stringify(detail.after, null, 2)}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <details className="rounded-lg border border-dashed border-stone-300 bg-stone-50/50 p-3 text-xs">
                  <summary className="cursor-pointer font-medium text-stone-600">
                    JSON gốc (gỡ lỗi)
                  </summary>
                  <pre className="mt-3 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] text-stone-700">
                    {JSON.stringify(
                      {
                        id: detail.id,
                        actor_id: detail.actor_id,
                        actor_role: detail.actor_role,
                        action: detail.action,
                        entity_type: detail.entity_type,
                        entity_id: detail.entity_id,
                        metadata: detail.metadata,
                        created_at: detail.created_at,
                        before: detail.before,
                        after: detail.after,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
