"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { BlockDataForm } from "@/components/tenant/core/admin/cms/BlockDataForm";
import { CmsJsonEditor } from "@/components/tenant/core/admin/cms/CmsJsonEditor";
import { useAuth } from "@/components/tenant/core/auth/AuthProvider";
import { defaultBlockData, validateBlockForm } from "@/lib/cms-block-form";
import {
  addAdminCmsBlock,
  addAdminCmsSection,
  createAdminCmsPage,
  deleteAdminCmsBlock,
  deleteAdminCmsSection,
  getAdminCmsPage,
  listAdminCmsPages,
  mintCmsPreviewToken,
  patchAdminCmsBlock,
  patchAdminCmsSection,
  publishAdminCmsPage,
  reorderAdminCmsBlocks,
  reorderAdminCmsSections,
  scheduleAdminCmsPublish,
  type CmsAdminBlock,
  type CmsAdminPage,
  type CmsAdminSection,
} from "@/lib/admin-cms-api";

const SECTION_TYPES = [
  "HERO",
  "PRODUCT_CAROUSEL",
  "CATEGORY_GRID",
  "BANNER",
  "FEATURED_COLLECTIONS",
  "STORY_CHAPTER",
  "LOOKBOOK_MOSAIC",
  "EDITORIAL",
  "SHOP_THE_LOOK",
  "JOURNAL_ROW",
  "PRESS_MARQUEE",
] as const;

const BLOCK_TYPES = [
  "BANNER",
  "PRODUCT",
  "CATEGORY",
  "HTML",
  "BRAND_STORY",
  "LOOKBOOK",
  "VIDEO",
  "QUOTE",
  "RICH_TEXT",
  "HOTSPOTS",
  "JOURNAL_LIST",
  "MARQUEE_LOGOS",
] as const;

function sortedSections(page: CmsAdminPage | null): CmsAdminSection[] {
  if (!page) return [];
  return [...page.sections].sort((a, b) => a.sort_order - b.sort_order);
}

function sortedBlocks(section: CmsAdminSection): CmsAdminBlock[] {
  return [...section.blocks].sort((a, b) => a.sort_order - b.sort_order);
}

function canCmsRead(role: string | null | undefined, permissions: string[]): boolean {
  return role === "ADMIN" || permissions.includes("CMS_READ") || permissions.includes("CMS_EDIT");
}

function canCmsEdit(role: string | null | undefined, permissions: string[]): boolean {
  return role === "ADMIN" || permissions.includes("CMS_EDIT");
}

function canCmsPublish(role: string | null | undefined, permissions: string[]): boolean {
  return role === "ADMIN" || permissions.includes("CMS_PUBLISH");
}

function StatusBadge({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-100 text-emerald-900 ring-1 ring-emerald-300/80"
          : "bg-stone-200 text-stone-700 ring-1 ring-stone-400/50"
      }`}
    >
      {children}
    </span>
  );
}

function PageStatusBadge({ active }: { active: boolean }) {
  return (
    <StatusBadge active={active}>{active ? "Trang đang bật" : "Trang đang tắt"}</StatusBadge>
  );
}

export default function AdminCmsPage() {
  const { role, permissions } = useAuth();
  const permList = permissions ?? [];
  const readOk = canCmsRead(role, permList);
  const editOk = canCmsEdit(role, permList);
  const publishOk = canCmsPublish(role, permList);

  const [pages, setPages] = useState<CmsAdminPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [pageDetail, setPageDetail] = useState<CmsAdminPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [scheduleRunAt, setScheduleRunAt] = useState("");

  const [newPageKey, setNewPageKey] = useState("");
  const [newPageTitle, setNewPageTitle] = useState("");

  const [newSectionType, setNewSectionType] = useState<string>("HERO");
  const [newSectionTitle, setNewSectionTitle] = useState("");

  const [addBlockSectionId, setAddBlockSectionId] = useState<string | null>(null);
  const [addBlockType, setAddBlockType] = useState<string>("BANNER");

  const [pageListQuery, setPageListQuery] = useState("");
  const [sectionQuery, setSectionQuery] = useState("");
  const [sectionStatusFilter, setSectionStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const loadPages = useCallback(async () => {
    const data = await listAdminCmsPages();
    setPages(data);
    return data;
  }, []);

  const loadDetail = useCallback(async (pageId: string) => {
    const detail = await getAdminCmsPage(pageId);
    setPageDetail(detail);
    return detail;
  }, []);

  useEffect(() => {
    if (!readOk) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await loadPages();
        if (cancelled) return;
        const home = data.find((p) => p.key === "homepage");
        const initialId = home?.id ?? data[0]?.id ?? null;
        setSelectedPageId(initialId);
        if (!initialId) {
          setPageDetail(null);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không tải được CMS.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readOk, loadPages]);

  useEffect(() => {
    if (!readOk || !selectedPageId) return;
    let cancelled = false;
    (async () => {
      try {
        setDetailLoading(true);
        setError(null);
        await loadDetail(selectedPageId);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Không tải chi tiết trang.");
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [readOk, selectedPageId, loadDetail]);

  const sectionsOrdered = useMemo(() => sortedSections(pageDetail), [pageDetail]);

  const filteredPages = useMemo(() => {
    const q = pageListQuery.trim().toLowerCase();
    let list = pages;
    if (q) {
      list = pages.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.key.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q),
      );
    }
    if (selectedPageId) {
      const selected = pages.find((p) => p.id === selectedPageId);
      if (selected && !list.some((p) => p.id === selectedPageId)) {
        list = [selected, ...list];
      }
    }
    return list;
  }, [pages, pageListQuery, selectedPageId]);

  const filteredSections = useMemo(() => {
    const q = sectionQuery.trim().toLowerCase();
    return sectionsOrdered.filter((s) => {
      if (sectionStatusFilter === "active" && !s.is_active) return false;
      if (sectionStatusFilter === "inactive" && s.is_active) return false;
      if (!q) return true;
      const blockMatch = s.blocks.some((b) => b.type.toLowerCase().includes(q));
      return (
        s.title.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        blockMatch ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [sectionsOrdered, sectionQuery, sectionStatusFilter]);

  async function handleOpenPreview() {
    if (!pageDetail) return;
    try {
      setError(null);
      setSuccess(null);
      const { token } = await mintCmsPreviewToken(pageDetail.id);
      const path =
        pageDetail.key === "homepage" ? "/" : `/${encodeURIComponent(pageDetail.key)}`;
      const sep = path.includes("?") ? "&" : "?";
      const url = `${typeof window !== "undefined" ? window.location.origin : ""}${path}${sep}cms_preview_token=${encodeURIComponent(token)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tạo được preview token.");
    }
  }

  async function handlePublish() {
    if (!editOk || !publishOk || !pageDetail) return;
    if (!window.confirm("Xác nhận publish: xóa cache Redis CMS cho trang này?")) return;
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      await publishAdminCmsPage(pageDetail.id);
      setSuccess("Đã publish (cache Redis đã xóa).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish thất bại.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSchedulePublish() {
    if (!editOk || !publishOk || !pageDetail || !scheduleRunAt) return;
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const d = new Date(scheduleRunAt);
      if (Number.isNaN(d.getTime())) {
        setError("Thời điểm lịch không hợp lệ.");
        return;
      }
      const { delay_ms } = await scheduleAdminCmsPublish(pageDetail.id, d.toISOString());
      setSuccess(`Đã xếp hàng publish (delay ~${Math.round(delay_ms / 1000)}s).`);
      setScheduleRunAt("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lên lịch được.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleToolbarRefresh() {
    try {
      setError(null);
      setSuccess(null);
      await refreshAll();
      setSuccess("Đã làm mới dữ liệu.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Làm mới thất bại.");
    }
  }

  async function refreshAll() {
    const data = await loadPages();
    if (selectedPageId) {
      const still = data.find((p) => p.id === selectedPageId);
      if (still) {
        await loadDetail(selectedPageId);
      } else {
        const next = data[0]?.id ?? null;
        setSelectedPageId(next);
      }
    }
  }

  async function handleCreatePage(e: React.FormEvent) {
    e.preventDefault();
    if (!editOk) return;
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const created = await createAdminCmsPage({
        page_key: newPageKey.trim(),
        title: newPageTitle.trim(),
      });
      setNewPageKey("");
      setNewPageTitle("");
      setSuccess("Đã tạo trang mới.");
      await loadPages();
      setSelectedPageId(created.id);
      setPageDetail(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không tạo được trang.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddSection(e: React.FormEvent) {
    e.preventDefault();
    if (!editOk || !pageDetail) return;
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      await addAdminCmsSection(pageDetail.id, {
        type: newSectionType,
        title: newSectionTitle.trim() || newSectionType,
      });
      setNewSectionTitle("");
      setSuccess("Đã thêm section.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thêm được section.");
    } finally {
      setActionLoading(false);
    }
  }

  async function moveSection(sectionId: string, direction: "up" | "down") {
    if (!editOk || !pageDetail) return;
    const ids = sectionsOrdered.map((s) => s.id);
    const i = ids.indexOf(sectionId);
    if (i < 0) return;
    const j = direction === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= ids.length) return;
    const next = [...ids];
    [next[i], next[j]] = [next[j], next[i]];
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const updated = await reorderAdminCmsSections(pageDetail.id, next);
      setPageDetail(updated);
      setSuccess("Đã cập nhật thứ tự section.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không reorder được.");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleSectionActive(s: CmsAdminSection) {
    if (!editOk) return;
    try {
      setActionLoading(true);
      setError(null);
      await patchAdminCmsSection(s.id, { is_active: !s.is_active });
      setSuccess("Đã cập nhật section.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được section.");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveSectionMeta(
    s: CmsAdminSection,
    title: string,
    type: string,
    layoutJson: string,
    targetingJson: string,
  ) {
    if (!editOk) return;
    let layout: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(layoutJson) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        layout = parsed as Record<string, unknown>;
      } else {
        setError("Layout phải là một object JSON.");
        return;
      }
    } catch {
      setError("JSON layout không hợp lệ.");
      return;
    }
    let targeting: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(targetingJson) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        targeting = parsed as Record<string, unknown>;
      } else {
        setError("Targeting phải là một object JSON.");
        return;
      }
    } catch {
      setError("JSON targeting không hợp lệ.");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      await patchAdminCmsSection(s.id, { title: title.trim(), type, layout, targeting });
      setSuccess("Đã lưu section.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được section.");
    } finally {
      setActionLoading(false);
    }
  }

  async function moveBlock(section: CmsAdminSection, block: CmsAdminBlock, dir: "up" | "down") {
    if (!editOk || !pageDetail) return;
    const blocks = sortedBlocks(section);
    const i = blocks.findIndex((b) => b.id === block.id);
    if (i < 0) return;
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j]!, next[i]!];
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      await reorderAdminCmsBlocks(section.id, next.map((b) => b.id));
      setSuccess("Đã cập nhật thứ tự block.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không reorder block được.");
    } finally {
      setActionLoading(false);
    }
  }

  async function removeSection(s: CmsAdminSection) {
    if (!editOk) return;
    if (!window.confirm(`Xóa section "${s.title}" và toàn bộ block bên trong?`)) return;
    try {
      setActionLoading(true);
      setError(null);
      await deleteAdminCmsSection(s.id);
      setSuccess("Đã xóa section.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được section.");
    } finally {
      setActionLoading(false);
    }
  }

  async function saveBlock(
    block: CmsAdminBlock,
    jsonText: string,
    type: string,
    sortOrder: number,
    isActive: boolean,
    appearanceJson: string,
  ) {
    if (!editOk) return;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(jsonText) as Record<string, unknown>;
    } catch {
      setError("JSON block không hợp lệ.");
      return;
    }
    let appearance: Record<string, unknown> | undefined;
    try {
      const parsed = JSON.parse(appearanceJson) as unknown;
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        appearance = parsed as Record<string, unknown>;
      } else {
        setError("Appearance phải là một object JSON.");
        return;
      }
    } catch {
      setError("JSON appearance không hợp lệ.");
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      await patchAdminCmsBlock(block.id, {
        type,
        data,
        sort_order: sortOrder,
        is_active: isActive,
        appearance,
      });
      setSuccess("Đã lưu block.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được block.");
    } finally {
      setActionLoading(false);
    }
  }

  async function toggleBlockActive(b: CmsAdminBlock) {
    if (!editOk) return;
    try {
      setActionLoading(true);
      setError(null);
      await patchAdminCmsBlock(b.id, { is_active: !b.is_active });
      setSuccess("Đã cập nhật block.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không cập nhật được block.");
    } finally {
      setActionLoading(false);
    }
  }

  async function removeBlock(b: CmsAdminBlock) {
    if (!editOk) return;
    if (!window.confirm("Xóa block này?")) return;
    try {
      setActionLoading(true);
      setError(null);
      await deleteAdminCmsBlock(b.id);
      setSuccess("Đã xóa block.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không xóa được block.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAddBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!editOk || !addBlockSectionId) return;
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      await addAdminCmsBlock(addBlockSectionId, {
        type: addBlockType,
        data: defaultBlockData(addBlockType),
      });
      setAddBlockSectionId(null);
      setSuccess("Đã thêm block.");
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thêm được block.");
    } finally {
      setActionLoading(false);
    }
  }

  if (!readOk) {
    return (
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Merchandising (CMS)</h1>
        <p className="text-sm text-stone-600">
          Tài khoản của bạn cần quyền <code className="rounded bg-stone-100 px-1">CMS_READ</code> hoặc{" "}
          <code className="rounded bg-stone-100 px-1">CMS_EDIT</code> (hoặc vai trò ADMIN) để truy cập màn hình này.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-10 pb-16 text-base leading-relaxed text-stone-800">
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-stone-900">Merchandising (CMS)</h1>
        <p className="text-base text-stone-600">
          Chỉnh layout trang chủ và landing. Sau khi lưu, cache Redis được xóa tự động — khách thấy bản mới trong vài
          giây.
        </p>
        {!editOk ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-950">
            Chế độ chỉ đọc: thiếu quyền <code className="rounded bg-amber-100/80 px-1.5 py-0.5">CMS_EDIT</code>.
          </p>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-900 shadow-sm">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-950 shadow-sm">
          {success}
        </div>
      ) : null}

      <div className="sticky top-0 z-30 -mx-4 border-b border-stone-200/90 bg-white/90 px-4 py-5 shadow-sm backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid w-full gap-4 sm:grid-cols-2 lg:max-w-4xl lg:grid-cols-4">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Chọn trang</span>
              <select
                className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium shadow-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-400/30"
                value={selectedPageId ?? ""}
                onChange={(e) => setSelectedPageId(e.target.value || null)}
                disabled={loading || pages.length === 0}
              >
                {pages.length === 0 ? <option value="">— Chưa có trang —</option> : null}
                {filteredPages.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title} ({p.key})
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Lọc danh sách trang</span>
              <input
                className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm shadow-sm placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-400/30"
                placeholder="Theo tiêu đề, key hoặc id…"
                value={pageListQuery}
                onChange={(e) => setPageListQuery(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Lọc section</span>
              <input
                className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm shadow-sm placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-400/30"
                placeholder="Tiêu đề, loại, block…"
                value={sectionQuery}
                onChange={(e) => setSectionQuery(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Trạng thái section</span>
              <select
                className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium shadow-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-400/30"
                value={sectionStatusFilter}
                onChange={(e) => setSectionStatusFilter(e.target.value as "all" | "active" | "inactive")}
              >
                <option value="all">Tất cả</option>
                <option value="active">Đang bật</option>
                <option value="inactive">Đang tắt</option>
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {pageDetail ? (
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50"
              >
                Xem site
              </a>
            ) : null}
            {readOk && pageDetail ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handleOpenPreview()}
                className="inline-flex items-center justify-center rounded-xl border border-violet-300 bg-violet-50 px-4 py-3 text-sm font-semibold text-violet-950 shadow-sm transition hover:bg-violet-100 disabled:opacity-50"
              >
                Preview (JWT)
              </button>
            ) : null}
            {editOk && publishOk && pageDetail ? (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => void handlePublish()}
                className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-stone-800 disabled:opacity-50"
              >
                Publish cache
              </button>
            ) : null}
            {editOk && publishOk && pageDetail ? (
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-stone-200 bg-stone-50 px-3 py-2">
                <label className="flex flex-col gap-1 text-xs font-semibold text-stone-600">
                  Lịch publish
                  <input
                    type="datetime-local"
                    className="rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-xs shadow-sm"
                    value={scheduleRunAt}
                    onChange={(e) => setScheduleRunAt(e.target.value)}
                    disabled={actionLoading}
                  />
                </label>
                <button
                  type="button"
                  disabled={actionLoading || !scheduleRunAt}
                  onClick={() => void handleSchedulePublish()}
                  className="mt-4 inline-flex items-center justify-center rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-800 disabled:opacity-50 sm:mt-0"
                >
                  Hẹn publish
                </button>
              </div>
            ) : null}
            <button
              type="button"
              disabled={actionLoading || !readOk}
              onClick={() => void handleToolbarRefresh()}
              className="inline-flex items-center justify-center rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-stone-800 shadow-sm transition hover:bg-stone-50 disabled:opacity-50"
            >
              Làm mới
            </button>
            {editOk ? (
              <a
                href="#cms-add-section"
                className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                + Thêm section
              </a>
            ) : null}
          </div>
        </div>
        {(sectionQuery || sectionStatusFilter !== "all") && filteredSections.length !== sectionsOrdered.length ? (
          <p className="mt-3 text-sm text-stone-600">
            Đang hiển thị <strong>{filteredSections.length}</strong> / {sectionsOrdered.length} section (bộ lọc đang
            bật). Thứ tự Lên/Xuống vẫn tính trên toàn bộ danh sách thật.
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm font-medium text-stone-600">Đang tải danh sách trang…</p>
      ) : null}
      {detailLoading ? (
        <p className="text-sm font-medium text-stone-500">Đang tải chi tiết trang…</p>
      ) : null}

      {editOk ? (
        <details className="group rounded-2xl border border-stone-200 bg-stone-50/90 shadow-sm open:bg-white">
          <summary className="cursor-pointer list-none rounded-2xl px-5 py-4 text-sm font-semibold text-stone-800 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="mr-2 inline-block text-stone-400 transition-transform group-open:rotate-90">▶</span>
            Tạo trang CMS mới (nâng cao)
          </summary>
          <div className="border-t border-stone-200 px-5 py-6">
            <form className="flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:items-end" onSubmit={handleCreatePage}>
              <label className="flex min-w-[10rem] flex-1 flex-col gap-2 text-sm">
                <span className="font-semibold text-stone-700">page_key</span>
                <input
                  className="rounded-xl border border-stone-300 px-3 py-3 text-sm shadow-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-400/30"
                  value={newPageKey}
                  onChange={(e) => setNewPageKey(e.target.value)}
                  placeholder="landing_sale"
                  required
                />
              </label>
              <label className="flex min-w-[10rem] flex-1 flex-col gap-2 text-sm">
                <span className="font-semibold text-stone-700">Tiêu đề</span>
                <input
                  className="rounded-xl border border-stone-300 px-3 py-3 text-sm shadow-sm focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-400/30"
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="Sale landing"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={actionLoading}
                className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-stone-900 px-6 text-sm font-bold text-white shadow-md transition hover:bg-stone-800 disabled:opacity-50"
              >
                Tạo trang
              </button>
            </form>
          </div>
        </details>
      ) : null}

      {pageDetail ? (
        <div className="space-y-10">
          <div className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-6 shadow-md sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-stone-900">{pageDetail.title}</h2>
              <p className="mt-2 font-mono text-xs text-stone-500">
                key=<span className="text-stone-700">{pageDetail.key}</span> · id={pageDetail.id}
              </p>
            </div>
            <PageStatusBadge active={pageDetail.is_active} />
          </div>

          {editOk ? (
            <form
              id="cms-add-section"
              className="scroll-mt-28 space-y-5 rounded-2xl border-2 border-dashed border-emerald-300/70 bg-emerald-50/40 p-6 shadow-sm"
              onSubmit={handleAddSection}
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-bold text-stone-900">Thêm section mới</h3>
                <span className="text-xs font-medium text-emerald-900">Hành động chính — thường dùng nhất</span>
              </div>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end">
                <label className="flex flex-1 flex-col gap-2 text-sm">
                  <span className="font-semibold text-stone-700">Loại section</span>
                  <select
                    className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium shadow-sm"
                    value={newSectionType}
                    onChange={(e) => setNewSectionType(e.target.value)}
                  >
                    {SECTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-[2] flex-col gap-2 text-sm">
                  <span className="font-semibold text-stone-700">Tiêu đề hiển thị</span>
                  <input
                    className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm shadow-sm"
                    value={newSectionTitle}
                    onChange={(e) => setNewSectionTitle(e.target.value)}
                    placeholder="Ví dụ: Hero chính, Flash sale tuần này…"
                  />
                </label>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex min-h-[48px] min-w-[160px] items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  Thêm section
                </button>
              </div>
            </form>
          ) : null}

          <div className="space-y-6">
            {filteredSections.length === 0 ? (
              <p className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-6 text-center text-sm text-stone-600">
                Không có section khớp bộ lọc. Đặt lại ô lọc hoặc chọn &quot;Tất cả&quot; trạng thái.
              </p>
            ) : null}
            {filteredSections.map((s) => {
              const globalIdx = sectionsOrdered.findIndex((x) => x.id === s.id);
              return (
                <SectionCard
                  key={sectionEditorKey(s)}
                  section={s}
                  index={globalIdx}
                  total={sectionsOrdered.length}
                  editOk={editOk}
                  actionLoading={actionLoading}
                  onMoveUp={() => void moveSection(s.id, "up")}
                  onMoveDown={() => void moveSection(s.id, "down")}
                  onToggleActive={() => void toggleSectionActive(s)}
                  onDelete={() => void removeSection(s)}
                  onSaveMeta={(title, type, layoutJson, targetingJson) =>
                    void saveSectionMeta(s, title, type, layoutJson, targetingJson)
                  }
                  onSaveBlock={(b, json, type, sort, active, appearanceJson) =>
                    void saveBlock(b, json, type, sort, active, appearanceJson)
                  }
                  onMoveBlock={(b, dir) => void moveBlock(s, b, dir)}
                  onToggleBlockActive={(b) => void toggleBlockActive(b)}
                  onDeleteBlock={(b) => void removeBlock(b)}
                  addBlockOpen={addBlockSectionId === s.id}
                  onOpenAddBlock={() => setAddBlockSectionId(s.id)}
                  onCloseAddBlock={() => setAddBlockSectionId(null)}
                  addBlockType={addBlockType}
                  setAddBlockType={setAddBlockType}
                  onSubmitAddBlock={handleAddBlock}
                />
              );
            })}
          </div>
        </div>
      ) : !loading ? (
        <p className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-6 text-center text-stone-600">
          Chưa có trang CMS. Chạy migration seed hoặc dùng form &quot;Tạo trang CMS mới&quot; bên trên.
        </p>
      ) : null}
    </section>
  );
}

function sectionEditorKey(s: CmsAdminSection): string {
  return JSON.stringify([s.id, s.title, s.type, s.layout ?? {}, s.targeting ?? {}]);
}

type SectionCardProps = {
  section: CmsAdminSection;
  index: number;
  total: number;
  editOk: boolean;
  actionLoading: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
  onSaveMeta: (title: string, type: string, layoutJson: string, targetingJson: string) => void;
  onMoveBlock: (b: CmsAdminBlock, dir: "up" | "down") => void;
  onSaveBlock: (
    b: CmsAdminBlock,
    json: string,
    type: string,
    sortOrder: number,
    isActive: boolean,
    appearanceJson: string,
  ) => void;
  onToggleBlockActive: (b: CmsAdminBlock) => void;
  onDeleteBlock: (b: CmsAdminBlock) => void;
  addBlockOpen: boolean;
  onOpenAddBlock: () => void;
  onCloseAddBlock: () => void;
  addBlockType: string;
  setAddBlockType: (v: string) => void;
  onSubmitAddBlock: (e: React.FormEvent) => void;
};

function SectionCard({
  section: s,
  index: idx,
  total,
  editOk,
  actionLoading,
  onMoveUp,
  onMoveDown,
  onToggleActive,
  onDelete,
  onSaveMeta,
  onMoveBlock,
  onSaveBlock,
  onToggleBlockActive,
  onDeleteBlock,
  addBlockOpen,
  onOpenAddBlock,
  onCloseAddBlock,
  addBlockType,
  setAddBlockType,
  onSubmitAddBlock,
}: SectionCardProps) {
  const [editTitle, setEditTitle] = useState(s.title);
  const [editType, setEditType] = useState(s.type);
  const [layoutJson, setLayoutJson] = useState(() => JSON.stringify(s.layout ?? {}, null, 2));
  const [targetingJson, setTargetingJson] = useState(() => JSON.stringify(s.targeting ?? {}, null, 2));

  const blocks = sortedBlocks(s);

  return (
    <details className="group/section rounded-2xl border border-stone-200 bg-white shadow-md open:ring-2 open:ring-stone-300/30">
      <summary className="flex cursor-pointer list-none flex-col gap-4 rounded-2xl p-5 marker:content-none sm:flex-row sm:items-center sm:justify-between [&::-webkit-details-marker]:hidden">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-1 text-stone-400 transition-transform group-open/section:rotate-90">▶</span>
          <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-500">Section</p>
            <h3 className="text-xl font-bold text-stone-900">{s.title || "(Chưa đặt tiêu đề)"}</h3>
            <div className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
              <span className="rounded-md bg-stone-100 px-2 py-0.5 font-mono text-xs font-medium text-stone-800">
                {s.type}
              </span>
              <span className="text-stone-400">·</span>
              <span>{blocks.length} block</span>
              <span className="text-stone-400">·</span>
              <span className="text-xs text-stone-500">#{s.sort_order}</span>
            </div>
            <StatusBadge active={s.is_active}>{s.is_active ? "Đang bật" : "Đang tắt"}</StatusBadge>
          </div>
        </div>
        {editOk ? (
          <div
            className="flex flex-wrap gap-2 border-t border-stone-100 pt-3 sm:border-t-0 sm:pt-0"
            onClick={(e) => e.preventDefault()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              disabled={actionLoading || idx < 0 || idx === 0}
              onClick={(e) => {
                e.preventDefault();
                onMoveUp();
              }}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-40"
            >
              Lên
            </button>
            <button
              type="button"
              disabled={actionLoading || idx < 0 || idx >= total - 1}
              onClick={(e) => {
                e.preventDefault();
                onMoveDown();
              }}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 disabled:opacity-40"
            >
              Xuống
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={(e) => {
                e.preventDefault();
                onToggleActive();
              }}
              className="rounded-xl border border-amber-300/80 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100"
            >
              {s.is_active ? "Ẩn section" : "Hiện section"}
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900 hover:bg-red-100"
            >
              Xóa
            </button>
          </div>
        ) : null}
      </summary>

      <div className="space-y-8 border-t border-stone-100 px-5 pb-8 pt-2">
        <div className="rounded-xl bg-stone-50/80 p-5">
          <h4 className="text-sm font-bold uppercase tracking-wide text-stone-600">Chỉnh sửa meta</h4>
          {editOk ? (
            <div className="mt-4 flex flex-col gap-5 lg:flex-row lg:items-end">
              <label className="flex flex-1 flex-col gap-2 text-sm">
                <span className="font-semibold text-stone-700">Tiêu đề</span>
                <input
                  className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm shadow-sm"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </label>
              <label className="flex flex-1 flex-col gap-2 text-sm">
                <span className="font-semibold text-stone-700">Loại</span>
                <select
                  className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium shadow-sm"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                >
                  {SECTION_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onSaveMeta(editTitle, editType, layoutJson, targetingJson)}
                className="inline-flex min-h-[48px] min-w-[140px] items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Lưu section
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-600">Chỉ xem — không có quyền CMS_EDIT.</p>
          )}
          {editOk ? (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Layout (JSON) — padding_top/bottom: none|sm|md|lg, max_width: narrow|standard|wide|full, anchor_id,
                background_color, theme: light|dark
              </p>
              <CmsJsonEditor value={layoutJson} onChange={setLayoutJson} disabled={actionLoading} aria-label="Layout section JSON" />
            </div>
          ) : null}
          {editOk ? (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                Targeting (JSON) — ví dụ: <code className="rounded bg-stone-200/80 px-1">{`{ "device": "mobile" }`}</code> hoặc{" "}
                <code className="rounded bg-stone-200/80 px-1">{`{ "device": "desktop" }`}</code>
              </p>
              <CmsJsonEditor
                value={targetingJson}
                onChange={setTargetingJson}
                disabled={actionLoading}
                aria-label="Targeting section JSON"
              />
            </div>
          ) : null}
          <p className="mt-3 font-mono text-xs text-stone-500">id={s.id}</p>
        </div>

        <div className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-lg font-bold text-stone-900">Blocks trong section</h4>
            {editOk ? (
              addBlockOpen ? (
                <button
                  type="button"
                  className="text-sm font-semibold text-stone-600 underline decoration-2 underline-offset-4 hover:text-stone-900"
                  onClick={onCloseAddBlock}
                >
                  Đóng form thêm block
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-stone-800"
                  onClick={onOpenAddBlock}
                >
                  + Thêm block
                </button>
              )
            ) : null}
          </div>

          {editOk && addBlockOpen ? (
            <form
              className="space-y-4 rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-5"
              onSubmit={onSubmitAddBlock}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-2 text-sm">
                  <span className="font-semibold text-stone-700">Loại block</span>
                  <select
                    className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium shadow-sm"
                    value={addBlockType}
                    onChange={(e) => setAddBlockType(e.target.value)}
                  >
                    {BLOCK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  Tạo block
                </button>
              </div>
            </form>
          ) : null}

          {blocks.length === 0 ? (
            <p className="rounded-xl border border-stone-200 bg-stone-50 px-5 py-6 text-center text-sm text-stone-600">
              Chưa có block. Dùng &quot;+ Thêm block&quot; để bắt đầu.
            </p>
          ) : (
            <div className="space-y-5">
              {blocks.map((b, bi) => (
                <BlockRow
                  key={cmsBlockServerSignature(b)}
                  block={b}
                  editOk={editOk}
                  actionLoading={actionLoading}
                  canMoveUp={bi > 0}
                  canMoveDown={bi < blocks.length - 1}
                  onMoveUp={() => onMoveBlock(b, "up")}
                  onMoveDown={() => onMoveBlock(b, "down")}
                  onSave={onSaveBlock}
                  onToggleActive={onToggleBlockActive}
                  onDelete={onDeleteBlock}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </details>
  );
}

type BlockRowProps = {
  block: CmsAdminBlock;
  editOk: boolean;
  actionLoading: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onSave: (
    b: CmsAdminBlock,
    json: string,
    type: string,
    sortOrder: number,
    isActive: boolean,
    appearanceJson: string,
  ) => void;
  onToggleActive: (b: CmsAdminBlock) => void;
  onDelete: (b: CmsAdminBlock) => void;
};

function mergeBlockFormState(blockType: string, data: Record<string, unknown>): Record<string, unknown> {
  return { ...defaultBlockData(blockType), ...data };
}

function cmsBlockServerSignature(block: CmsAdminBlock): string {
  return [
    block.id,
    block.type,
    String(block.sort_order),
    block.is_active ? "1" : "0",
    JSON.stringify(block.data),
    JSON.stringify(block.appearance ?? {}),
  ].join("\u001e");
}

function BlockRow({
  block: b,
  editOk,
  actionLoading,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onSave,
  onToggleActive,
  onDelete,
}: BlockRowProps) {
  const [type, setType] = useState(b.type);
  const [sortOrder, setSortOrder] = useState(b.sort_order);
  const [isActive, setIsActive] = useState(b.is_active);
  const [formData, setFormData] = useState<Record<string, unknown>>(() => mergeBlockFormState(b.type, b.data));
  const [jsonDraft, setJsonDraft] = useState(() => JSON.stringify(mergeBlockFormState(b.type, b.data), null, 2));
  const [appearanceJson, setAppearanceJson] = useState(() => JSON.stringify(b.appearance ?? {}, null, 2));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const blockSyncKey = cmsBlockServerSignature(b);
  useEffect(() => {
    setType(b.type);
    setSortOrder(b.sort_order);
    setIsActive(b.is_active);
    setFormData(mergeBlockFormState(b.type, b.data));
    setJsonDraft(JSON.stringify(mergeBlockFormState(b.type, b.data), null, 2));
    setAppearanceJson(JSON.stringify(b.appearance ?? {}, null, 2));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when server payload signature changes
  }, [blockSyncKey]);

  function handleTypeChange(nextType: string) {
    setType(nextType);
    const nextForm = defaultBlockData(nextType);
    setFormData(nextForm);
    setJsonDraft(JSON.stringify(nextForm, null, 2));
    setErrors({});
  }

  function handleSaveClick() {
    const result = validateBlockForm(type, formData);
    if (!result.valid) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSave(b, JSON.stringify(result.data, null, 2), type, sortOrder, isActive, appearanceJson);
  }

  function applyJsonDraftToForm() {
    try {
      const parsed = JSON.parse(jsonDraft) as Record<string, unknown>;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setErrors({ _json: "JSON phải là một object." });
        return;
      }
      setFormData(mergeBlockFormState(type, parsed));
      setErrors({});
    } catch {
      setErrors({ _json: "Không parse được JSON. Kiểm tra dấu phẩy và ngoặc." });
    }
  }

  return (
    <details
      className="group/block rounded-2xl border border-stone-200 bg-stone-50/60 shadow-sm open:bg-white open:shadow-md"
      onToggle={(e) => {
        const el = e.currentTarget;
        if (el.open) {
          setJsonDraft(JSON.stringify(formData, null, 2));
        }
      }}
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 rounded-2xl p-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-stone-400 transition-transform group-open/block:rotate-90">▶</span>
          <span className="rounded-lg bg-stone-200 px-2.5 py-1 font-mono text-xs font-bold text-stone-800">{type}</span>
          <StatusBadge active={b.is_active}>{b.is_active ? "Block bật" : "Block tắt"}</StatusBadge>
          <span className="font-mono text-xs text-stone-500">sort {b.sort_order}</span>
        </div>
        {editOk ? (
          <div className="flex flex-wrap gap-2" onClick={(e) => e.preventDefault()}>
            <button
              type="button"
              disabled={actionLoading || !canMoveUp}
              onClick={(e) => {
                e.preventDefault();
                onMoveUp();
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 disabled:opacity-40"
            >
              Block ↑
            </button>
            <button
              type="button"
              disabled={actionLoading || !canMoveDown}
              onClick={(e) => {
                e.preventDefault();
                onMoveDown();
              }}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-800 disabled:opacity-40"
            >
              Block ↓
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={(e) => {
                e.preventDefault();
                onToggleActive(b);
              }}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950"
            >
              {b.is_active ? "Ẩn" : "Hiện"}
            </button>
            <button
              type="button"
              disabled={actionLoading}
              onClick={(e) => {
                e.preventDefault();
                onDelete(b);
              }}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-900"
            >
              Xóa block
            </button>
          </div>
        ) : null}
      </summary>

      <div className="space-y-6 border-t border-stone-200 px-4 pb-6 pt-4">
        <p className="font-mono text-xs text-stone-500">id={b.id}</p>

        {editOk ? (
          <div className="space-y-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-stone-700">Loại block</span>
                <select
                  className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-medium shadow-sm"
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                >
                  {BLOCK_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-semibold text-stone-700">Thứ tự (sort_order)</span>
                <input
                  type="number"
                  min={0}
                  className="w-full max-w-[10rem] rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm shadow-sm sm:max-w-[12rem]"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(Number(e.target.value))}
                />
              </label>
              <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm font-medium shadow-sm">
                <input
                  type="checkbox"
                  role="switch"
                  aria-checked={isActive}
                  className="h-4 w-4 rounded border-stone-400 text-emerald-600"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                Hiển thị trên site
              </label>
            </div>

            <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-inner">
              <h4 className="text-sm font-bold uppercase tracking-wide text-stone-500">Nội dung block</h4>
              <p className="mt-1 text-xs text-stone-500">
                Điền theo form — dữ liệu được kiểm tra trước khi gửi (khớp quy tắc API).
              </p>
              <div className="mt-5">
                <BlockDataForm
                  type={type}
                  value={formData}
                  onChange={(next) => {
                    setFormData(next);
                    setErrors({});
                  }}
                  errors={errors}
                  disabled={actionLoading}
                />
              </div>
              {errors._type ? <p className="mt-3 text-sm text-red-600">{errors._type}</p> : null}
            </div>

            <details className="rounded-2xl border border-stone-200 bg-stone-50/90">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-stone-800 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="mr-2 text-stone-400">▶</span> JSON nâng cao (tùy chọn)
              </summary>
              <div className="space-y-3 border-t border-stone-200 px-4 py-4">
                <p className="text-xs text-stone-600">
                  Dùng khi cần dán nguyên payload. Bấm &quot;Áp dụng vào form&quot; để đưa vào các trường phía trên rồi
                  Lưu.
                </p>
                <CmsJsonEditor
                  value={jsonDraft}
                  onChange={setJsonDraft}
                  disabled={actionLoading}
                  aria-label="Chỉnh JSON block nâng cao"
                />
                {errors._json ? <p className="text-sm text-red-600">{errors._json}</p> : null}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={applyJsonDraftToForm}
                  className="rounded-xl border border-stone-400 bg-white px-4 py-2.5 text-sm font-semibold text-stone-900 shadow-sm hover:bg-stone-50"
                >
                  Áp dụng JSON vào form
                </button>
              </div>
            </details>

            <details className="rounded-2xl border border-stone-200 bg-stone-50/90">
              <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-stone-800 marker:content-none [&::-webkit-details-marker]:hidden">
                <span className="mr-2 text-stone-400">▶</span> Appearance (JSON)
              </summary>
              <div className="space-y-2 border-t border-stone-200 px-4 py-4">
                <p className="text-xs text-stone-600">Tuỳ chọn: ratio, rounded, shadow — dùng cùng lúc với Lưu block.</p>
                <CmsJsonEditor
                  value={appearanceJson}
                  onChange={setAppearanceJson}
                  disabled={actionLoading}
                  aria-label="Appearance block JSON"
                />
              </div>
            </details>

            <div className="flex flex-wrap gap-3 border-t border-stone-200 pt-5">
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleSaveClick}
                className="inline-flex min-h-[48px] min-w-[160px] items-center justify-center rounded-xl bg-emerald-600 px-6 text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-50"
              >
                Lưu block
              </button>
              <p className="max-w-lg text-xs leading-relaxed text-stone-500">
                Lưu sẽ kiểm tra ràng buộc (bắt buộc, UUID, độ dài HTML…). Sửa các dòng báo đỏ trước khi thử lại.
              </p>
            </div>
          </div>
        ) : (
          <pre className="max-h-60 overflow-auto rounded-xl border border-stone-200 bg-stone-900 p-4 font-mono text-xs text-emerald-100">
            {JSON.stringify(formData, null, 2)}
          </pre>
        )}
      </div>
    </details>
  );
}
