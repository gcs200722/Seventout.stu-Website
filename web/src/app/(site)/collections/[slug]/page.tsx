import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGridCard } from "@/components/products/ProductGridCard";
import { findCategoryBySlug } from "@/lib/categories-api";
import { listProductsPublic } from "@/lib/products-api";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function CollectionDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const category = await findCategoryBySlug(slug);

  if (!category) {
    notFound();
  }

  let products: Awaited<ReturnType<typeof listProductsPublic>>["items"] = [];
  try {
    const result = await listProductsPublic({
      page: 1,
      limit: 8,
      category_id: category.id,
      sort: "newest",
      is_active: true,
    });
    products = result.items;
  } catch {
    products = [];
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

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/collections"
              className="inline-flex rounded-full border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              Tất cả bộ sưu tập
            </Link>
            <Link
              href={`/products?category_id=${category.id}`}
              className="inline-flex rounded-full bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              Xem toàn bộ sản phẩm
            </Link>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">Sản phẩm trong danh mục</h2>
            <p className="mt-1 text-sm text-stone-600">Danh sách được đồng bộ trực tiếp từ Product module.</p>
          </div>
          {products.length > 0 ? (
            <Link
              href={`/products?category_id=${category.id}`}
              className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
            >
              Xem tất cả
            </Link>
          ) : null}
        </div>

        {products.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white p-6 text-sm text-stone-600">
            Chưa có sản phẩm trong danh mục này.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((item) => (
              <ProductGridCard key={item.id} product={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
