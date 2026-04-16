"use client";

import { useEffect, useState } from "react";

import {
  createAdminCategory,
  deleteAdminCategory,
  patchAdminCategory,
  type AdminCategory,
} from "@/lib/admin-api";
import { getCategoryByIdPublic, listCategoriesPublic } from "@/lib/categories-api";

const PAGE_LIMIT = 50;

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createParentId, setCreateParentId] = useState("");
  const [createImageUrl, setCreateImageUrl] = useState("");

  const [selected, setSelected] = useState<AdminCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editActive, setEditActive] = useState(true);

  async function loadCategories() {
    try {
      setLoading(true);
      setError(null);
      const data = await listCategoriesPublic({ page: 1, limit: PAGE_LIMIT });
      setCategories(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải được danh mục.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  async function openEdit(c: AdminCategory) {
    try {
      setActionLoading(true);
      const detail = await getCategoryByIdPublic(c.id);
      setSelected(c);
      setEditName(detail.name);
      setEditDescription(detail.description ?? "");
      setEditImageUrl(detail.image_url ?? "");
      setEditActive(detail.is_active);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tải chi tiết danh mục.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    try {
      setActionLoading(true);
      setSuccessMessage(null);
      setError(null);
      const parent = createParentId.trim();
      await createAdminCategory({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        parent_id: parent.length > 0 ? parent : null,
        image_url: createImageUrl.trim() || undefined,
      });
      setCreateName("");
      setCreateDescription("");
      setCreateParentId("");
      setCreateImageUrl("");
      setSuccessMessage("Đã tạo danh mục.");
      await loadCategories();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không tạo được danh mục.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSaveEdit() {
    if (!selected) {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      await patchAdminCategory(selected.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        image_url: editImageUrl.trim() || undefined,
        is_active: editActive,
      });
      setSuccessMessage("Đã cập nhật danh mục.");
      await loadCategories();
      const fresh = (await listCategoriesPublic({ page: 1, limit: PAGE_LIMIT })).find((c) => c.id === selected.id);
      if (fresh) {
        await openEdit(fresh);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không cập nhật được.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Xóa mềm danh mục này?");
    if (!ok) {
      return;
    }
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(null);
      await deleteAdminCategory(id);
      if (selected?.id === id) {
        setSelected(null);
      }
      setSuccessMessage("Đã xóa danh mục.");
      await loadCategories();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không xóa được.");
    } finally {
      setActionLoading(false);
    }
  }

  const roots = categories
    .filter((c) => c.level === 1)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold">Quản lý danh mục</h1>
        <p className="mt-1 text-sm text-stone-600">
          Tạo / cập nhật / xóa mềm danh mục. Cần quyền <code className="rounded bg-stone-100 px-1">CATEGORY_MANAGER</code>.
        </p>
      </header>

      {successMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{successMessage}</div>
      ) : null}
      {error ? (
        <div className="whitespace-pre-line rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={(e) => void handleCreate(e)}
        className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4"
      >
        <h2 className="text-sm font-semibold text-stone-900">Tạo danh mục</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="text-stone-600">Tên *</span>
            <input
              required
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="text-stone-600">Danh mục cha (level 1)</span>
            <select
              value={createParentId}
              onChange={(e) => setCreateParentId(e.target.value)}
              className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Không chọn (tạo danh mục cấp 1) —</option>
              {roots.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.is_active ? " (đang tắt)" : ""}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-xs text-stone-500">
              Chọn một danh mục gốc để tạo danh mục con (cấp 2). Để trống để tạo danh mục gốc mới.
            </span>
          </label>
        </div>
        <label className="block text-sm">
          <span className="text-stone-600">Mô tả</span>
          <textarea
            value={createDescription}
            onChange={(e) => setCreateDescription(e.target.value)}
            rows={2}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm">
          <span className="text-stone-600">Image URL</span>
          <input
            value={createImageUrl}
            onChange={(e) => setCreateImageUrl(e.target.value)}
            className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={actionLoading}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          Tạo mới
        </button>
      </form>

      {loading ? <p className="text-sm text-stone-500">Đang tải...</p> : null}

      {!loading ? (
        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
            <table className="min-w-full divide-y divide-stone-200 text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-600">
                <tr>
                  <th className="px-4 py-3">Tên</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Cấp</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {categories.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-600">{c.slug}</td>
                    <td className="px-4 py-3">{c.level}</td>
                    <td className="px-4 py-3">{c.is_active ? "Có" : "Không"}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="mr-2 rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100"
                        onClick={() => void openEdit(c)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="rounded border border-rose-300 px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                        onClick={() => void handleDelete(c.id)}
                        disabled={actionLoading}
                      >
                        Xóa
                      </button>
                    </td>
                  </tr>
                ))}
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-stone-500">
                      Chưa có danh mục.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <aside className="space-y-3 rounded-xl border border-stone-200 bg-stone-50 p-4">
            <h2 className="text-base font-semibold">Chi tiết / cập nhật</h2>
            {!selected ? (
              <p className="text-sm text-stone-500">Chọn &quot;Sửa&quot; từ bảng.</p>
            ) : (
              <div className="space-y-2">
                <p className="font-mono text-xs text-stone-500">{selected.id}</p>
                <label className="block text-sm">
                  Tên
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Mô tả
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="block text-sm">
                  Image URL
                  <input
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    className="mt-1 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                  Đang hoạt động
                </label>
                <button
                  type="button"
                  onClick={() => void handleSaveEdit()}
                  disabled={actionLoading}
                  className="w-full rounded-md bg-stone-900 px-3 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
                >
                  Lưu thay đổi
                </button>
              </div>
            )}
            <p className="text-xs text-stone-500">Danh mục gốc hiện có: {roots.length}</p>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
