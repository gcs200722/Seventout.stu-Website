import Link from "next/link";
import { notFound } from "next/navigation";

import { findCategoryBySlug } from "@/lib/categories-api";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CollectionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await findCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  const image = category.image_url?.trim()
    ? category.image_url
    : "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-xs text-stone-500">
        <Link href="/collections" className="hover:text-stone-800">
          Bộ sưu tập
        </Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">{category.name}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL ảnh từ API/CDN đa dạng */}
          <img src={image} alt={category.name} className="h-full w-full object-cover" />
        </div>
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
            {category.level === 1 ? "Danh mục gốc" : "Danh mục"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{category.name}</h1>
          {category.description ? (
            <p className="mt-4 text-sm leading-relaxed text-stone-600">{category.description}</p>
          ) : (
            <p className="mt-4 text-sm text-stone-500">Chưa có mô tả cho danh mục này.</p>
          )}

          <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-medium">Sản phẩm theo danh mục</p>
            <p className="mt-1 text-amber-800/90">
              Danh sách sản phẩm sẽ hiển thị khi module sản phẩm trên API sẵn sàng. Hiện bạn có thể tiếp tục
              khám phá các bộ sưu tập khác.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/collections"
              className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              Tất cả bộ sưu tập
            </Link>
            <Link
              href="/#best-selling"
              className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              Xem gợi ý trên trang chủ
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
