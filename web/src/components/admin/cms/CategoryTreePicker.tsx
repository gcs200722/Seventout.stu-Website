"use client";

import { useEffect, useMemo, useState } from "react";

import { listCategoryTreePublic, type CategoryTreeItem } from "@/lib/categories-api";

export type CategoryPickRow = { id: string; name: string; image: string };

type FlatRow = {
  id: string;
  name: string;
  image_url: string;
  depth: number;
  slug: string;
};

function flattenTree(nodes: CategoryTreeItem[]): FlatRow[] {
  const out: FlatRow[] = [];
  for (const root of nodes) {
    out.push({
      id: root.id,
      name: root.name,
      image_url: root.image_url,
      depth: 0,
      slug: root.slug,
    });
    for (const ch of root.children ?? []) {
      out.push({
        id: ch.id,
        name: ch.name,
        image_url: ch.image_url,
        depth: 1,
        slug: ch.slug,
      });
    }
  }
  return out;
}

type CategoryTreePickerProps = {
  categories: CategoryPickRow[];
  onCategoriesChange: (rows: CategoryPickRow[]) => void;
  errors: Record<string, string>;
  disabled?: boolean;
};

export function CategoryTreePicker({
  categories,
  onCategoriesChange,
  errors,
  disabled,
}: CategoryTreePickerProps) {
  const [tree, setTree] = useState<CategoryTreeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setLoadError(null);
        const data = await listCategoryTreePublic();
        if (!cancelled) setTree(data);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Không tải được cây danh mục.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const flat = useMemo(() => flattenTree(tree), [tree]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return flat;
    return flat.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q),
    );
  }, [flat, filter]);

  const selectedIds = useMemo(() => new Set(categories.map((c) => c.id)), [categories]);

  function addFromTree(row: FlatRow) {
    if (disabled) return;
    if (selectedIds.has(row.id)) return;
    onCategoriesChange([
      ...categories,
      { id: row.id, name: row.name, image: row.image_url?.trim() ?? "" },
    ]);
  }

  function removeAt(index: number) {
    if (disabled) return;
    onCategoriesChange(categories.filter((_, i) => i !== index));
  }

  function move(index: number, dir: -1 | 1) {
    if (disabled) return;
    const j = index + dir;
    if (j < 0 || j >= categories.length) return;
    const next = [...categories];
    [next[index], next[j]] = [next[j], next[index]];
    onCategoriesChange(next);
  }

  return (
    <div className="space-y-5">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">Lọc trong cây danh mục</span>
        <input
          className="rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm shadow-sm"
          disabled={disabled}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Tên, slug hoặc id…"
        />
      </label>

      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      {errors.categories ? <p className="text-sm text-red-600">{errors.categories}</p> : null}

      <div className="rounded-2xl border border-stone-200 bg-stone-50/80">
        <p className="border-b border-stone-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-stone-500">
          Chọn danh mục (cấp 1 · cấp 2)
        </p>
        <div className="max-h-64 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-6 text-center text-sm text-stone-500">Đang tải cây danh mục…</p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-600">Không có mục khớp bộ lọc.</p>
          ) : (
            <ul className="divide-y divide-stone-200">
              {filtered.map((row) => {
                const picked = selectedIds.has(row.id);
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-2 px-2 py-2"
                    style={{ paddingLeft: `${8 + row.depth * 16}px` }}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-stone-900">
                      {row.depth > 0 ? (
                        <span className="text-stone-400">└ </span>
                      ) : null}
                      <span className="font-medium">{row.name}</span>
                      <span className="ml-1 text-xs text-stone-500">({row.slug})</span>
                    </span>
                    <button
                      type="button"
                      disabled={disabled || picked}
                      onClick={() => addFromTree(row)}
                      className="shrink-0 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-900 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {picked ? "Đã thêm" : "Thêm"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold text-stone-800">
          Thứ tự hiển thị trên lưới ({categories.length} mục)
        </p>
        {categories.length === 0 ? (
          <p className="mt-2 text-xs text-stone-500">Chưa chọn danh mục — bấm &quot;Thêm&quot; trên cây.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {categories.map((row, index) => {
              const rowErr =
                errors[`categories_${index}_id`] ??
                errors[`categories_${index}_name`] ??
                errors[`categories_${index}_image`];
              return (
                <li
                  key={row.id ? row.id : `empty-${index}`}
                  className="flex flex-col gap-1 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-center text-xs font-bold text-stone-400">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate font-medium text-stone-900">{row.name}</span>
                    <span className="hidden max-w-[6rem] truncate font-mono text-[10px] text-stone-400 sm:inline">
                      {row.id ? `${row.id.slice(0, 8)}…` : ""}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        disabled={disabled || index === 0}
                        className="rounded border border-stone-200 px-2 py-1 text-xs disabled:opacity-30"
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={disabled || index >= categories.length - 1}
                        className="rounded border border-stone-200 px-2 py-1 text-xs disabled:opacity-30"
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-50"
                        onClick={() => removeAt(index)}
                      >
                        Bỏ
                      </button>
                    </div>
                  </div>
                  {rowErr ? <p className="pl-8 text-xs text-red-600">{rowErr}</p> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
