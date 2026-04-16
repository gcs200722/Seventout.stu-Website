import Link from "next/link";

import { CollectionCard } from "@/components/home/CollectionCard";
import { type CategoryListItem, listCategoriesPublic } from "@/lib/categories-api";

const PLACEHOLDER =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80";

export default async function CollectionsPage() {
  let roots: CategoryListItem[] = [];
  try {
    roots = await listCategoriesPublic({ page: 1, limit: 50, parent_id: null });
  } catch {
    roots = [];
  }

  const items = roots.filter((c) => c.level === 1 && c.is_active);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Shop</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Bộ sưu tập</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Chọn danh mục để xem chi tiết. Danh mục được đồng bộ từ hệ thống quản trị.
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-600">
          Chưa có danh mục nào. Vui lòng quay lại sau.
          <div className="mt-4">
            <Link href="/" className="text-sm font-semibold text-stone-900 underline underline-offset-4">
              Về trang chủ
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((c) => (
            <CollectionCard
              key={c.id}
              collection={{
                id: c.id,
                title: c.name,
                cta: "Xem chi tiết",
                slug: `/collections/${c.slug}`,
                image: c.image_url?.trim() ? c.image_url : PLACEHOLDER,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
