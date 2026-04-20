"use client";

import { useCallback, useEffect, useState } from "react";
import { listAdminCmsAssets, type CmsAdminAsset } from "@/lib/admin-cms-api";

type CmsAssetLibraryModalProps = {
  open: boolean;
  onClose: () => void;
  onPickUrl: (url: string) => void;
};

export function CmsAssetLibraryModal({ open, onClose, onPickUrl }: CmsAssetLibraryModalProps) {
  const [items, setItems] = useState<CmsAdminAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAdminCmsAssets(60);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được thư viện.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      void load();
    }
  }, [open, load]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2 className="text-lg font-bold text-stone-900">Thư viện ảnh CMS</h2>
          <button type="button" className="text-sm font-semibold text-stone-600 hover:text-stone-900" onClick={onClose}>
            Đóng
          </button>
        </div>
        <div className="max-h-[calc(85vh-88px)] overflow-y-auto px-5 py-4">
          {loading ? <p className="text-sm text-stone-600">Đang tải…</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!loading && !error && items.length === 0 ? (
            <p className="text-sm text-stone-600">Chưa có asset. Dùng API presign/register hoặc thêm từ tooling.</p>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-3">
            {items.map((a) => (
              <button
                key={a.id}
                type="button"
                className="group flex flex-col overflow-hidden rounded-xl border border-stone-200 bg-stone-50 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md"
                onClick={() => {
                  onPickUrl(a.public_url);
                  onClose();
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.public_url} alt={a.alt || ""} className="aspect-square w-full object-cover" />
                <span className="truncate px-2 py-2 text-xs font-medium text-stone-800 group-hover:text-emerald-800">
                  Chọn URL này
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
