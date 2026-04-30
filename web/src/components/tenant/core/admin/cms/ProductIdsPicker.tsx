"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  formatVnd,
  getProductByIdPublic,
  listProductsPublic,
  type ProductListItem,
} from "@/lib/products-api";

type ProductIdsPickerProps = {
  ids: string[];
  onIdsChange: (ids: string[]) => void;
  error?: string;
  disabled?: boolean;
};

export function ProductIdsPicker({ ids, onIdsChange, error, disabled }: ProductIdsPickerProps) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [metaById, setMetaById] = useState<Record<string, { name: string; thumbnail: string }>>({});
  const metaByIdRef = useRef(metaById);
  metaByIdRef.current = metaById;

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const loadPage = useCallback(
    async (targetPage: number, append: boolean) => {
      try {
        setLoading(true);
        setListError(null);
        const { items: rows, pagination } = await listProductsPublic({
          page: targetPage,
          limit: 12,
          keyword: debouncedSearch || undefined,
          is_active: true,
          sort: "newest",
        });
        setTotal(pagination.total);
        setItems((prev) => (append ? mergeById(prev, rows) : rows));
        setPage(targetPage);
        setMetaById((prev) => {
          const next = { ...prev };
          for (const p of rows) {
            next[p.id] = { name: p.name, thumbnail: p.thumbnail };
          }
          return next;
        });
      } catch (e) {
        setListError(e instanceof Error ? e.message : "Không tải được sản phẩm.");
      } finally {
        setLoading(false);
      }
    },
    [debouncedSearch],
  );

  useEffect(() => {
    setPage(1);
    void loadPage(1, false);
  }, [debouncedSearch, loadPage]);

  const idsKey = useMemo(() => ids.join("|"), [ids]);
  useEffect(() => {
    const currentIds = idsKey.length === 0 ? [] : idsKey.split("|");
    const missing = currentIds.filter((id) => !metaByIdRef.current[id]);
    if (missing.length === 0) {
      return;
    }
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        missing.map(async (id) => {
          try {
            const d = await getProductByIdPublic(id);
            return { id, name: d.name, thumbnail: d.images[0] ?? "" };
          } catch {
            return { id, name: id.slice(0, 8) + "…", thumbnail: "" };
          }
        }),
      );
      if (cancelled) return;
      setMetaById((prev) => {
        const next = { ...prev };
        for (const r of results) {
          next[r.id] = { name: r.name, thumbnail: r.thumbnail };
        }
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const idSet = useMemo(() => new Set(ids), [ids]);

  function toggleId(product: ProductListItem) {
    if (disabled) return;
    if (idSet.has(product.id)) {
      onIdsChange(ids.filter((x) => x !== product.id));
    } else {
      onIdsChange([...ids, product.id]);
    }
  }

  function removeId(id: string) {
    if (disabled) return;
    onIdsChange(ids.filter((x) => x !== id));
  }

  const hasMore = items.length < total;

  return (
    <div className="space-y-4">
      <label className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-stone-800">Tìm và chọn sản phẩm</span>
        <input
          className={`rounded-xl border px-3 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-stone-400/40 ${
            error ? "border-red-400 bg-red-50/50" : "border-stone-300 bg-white"
          }`}
          disabled={disabled}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Gõ tên hoặc để trống để xem mới nhất…"
        />
      </label>

      {listError ? <p className="text-sm text-red-600">{listError}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="rounded-2xl border border-stone-200 bg-stone-50/80">
        <div className="max-h-72 overflow-y-auto divide-y divide-stone-200">
          {loading && items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-500">Đang tải…</p>
          ) : null}
          {!loading && items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-stone-600">Không có sản phẩm khớp tìm kiếm.</p>
          ) : null}
          {items.map((p) => {
            const selected = idSet.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                disabled={disabled}
                onClick={() => toggleId(p)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition hover:bg-white ${
                  selected ? "bg-emerald-50/90" : ""
                }`}
              >
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                    selected ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 bg-white"
                  }`}
                >
                  {selected ? "✓" : ""}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-stone-900">{p.name}</p>
                  <p className="truncate text-xs text-stone-500">{p.category.name}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-stone-700">{formatVnd(p.price)}</span>
              </button>
            );
          })}
        </div>
        {hasMore ? (
          <div className="border-t border-stone-200 p-2">
            <button
              type="button"
              disabled={disabled || loading}
              onClick={() => void loadPage(page + 1, true)}
              className="w-full rounded-lg py-2 text-sm font-semibold text-stone-800 hover:bg-white disabled:opacity-50"
            >
              {loading ? "Đang tải…" : `Tải thêm (${items.length}/${total})`}
            </button>
          </div>
        ) : null}
      </div>

      <div>
        <p className="text-sm font-semibold text-stone-800">
          Đã chọn <span className="text-emerald-700">{ids.length}</span> sản phẩm (thứ tự hiển thị = thứ tự dưới đây)
        </p>
        {ids.length === 0 ? (
          <p className="mt-2 text-xs text-stone-500">Chưa chọn sản phẩm nào — chọn từ danh sách phía trên.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {ids.map((id, index) => {
              const meta = metaById[id];
              return (
                <li
                  key={id}
                  className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  <span className="w-6 shrink-0 text-center text-xs font-bold text-stone-400">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-stone-900">
                    {meta?.name ?? id.slice(0, 8) + "…"}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      disabled={disabled || index === 0}
                      className="rounded border border-stone-200 px-2 py-1 text-xs disabled:opacity-30"
                      onClick={() => {
                        const next = [...ids];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        onIdsChange(next);
                      }}
                      title="Lên"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      disabled={disabled || index >= ids.length - 1}
                      className="rounded border border-stone-200 px-2 py-1 text-xs disabled:opacity-30"
                      onClick={() => {
                        const next = [...ids];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        onIdsChange(next);
                      }}
                      title="Xuống"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      className="rounded border border-red-200 px-2 py-1 text-xs font-semibold text-red-800 hover:bg-red-50"
                      onClick={() => removeId(id)}
                    >
                      Bỏ
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <details className="rounded-xl border border-stone-200 bg-stone-50/60 text-xs text-stone-600">
        <summary className="cursor-pointer px-3 py-2 font-semibold text-stone-700">Dán UUID thủ công (tuỳ chọn)</summary>
        <div className="border-t border-stone-200 px-3 py-3">
          <textarea
            className="w-full rounded-lg border border-stone-300 bg-white p-2 font-mono text-[12px]"
            rows={4}
            disabled={disabled}
            value={ids.join("\n")}
            onChange={(e) => {
              const lines = e.target.value
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean);
              onIdsChange(lines);
            }}
            spellCheck={false}
          />
        </div>
      </details>
    </div>
  );
}

function mergeById(prev: ProductListItem[], more: ProductListItem[]): ProductListItem[] {
  const map = new Map<string, ProductListItem>();
  for (const p of prev) map.set(p.id, p);
  for (const p of more) map.set(p.id, p);
  return [...map.values()];
}
