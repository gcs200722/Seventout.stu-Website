import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGridCard } from "@/components/products/ProductGridCard";
import { findCategoryBySlug, listCategoriesPublic } from "@/lib/categories-api";
import { listProductStocksPublic, listProductsPublic, type ProductSort } from "@/lib/products-api";

type PageProps = {
  params: Promise<{ parentCategorySlug: string }>;
  searchParams: Promise<{
    page?: string;
    keyword?: string;
    sort?: ProductSort;
    min_price?: string;
    max_price?: string;
  }>;
};

const PAGE_SIZE = 12;

function toPositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

export default async function ParentCategoryPage({ params, searchParams }: PageProps) {
  const { parentCategorySlug } = await params;
  const query = await searchParams;
  const category = await findCategoryBySlug(parentCategorySlug);
  if (!category || category.level !== 1 || !category.is_active) {
    notFound();
  }

  const page = toPositiveInt(query.page, 1);
  const keyword = query.keyword?.trim() || undefined;
  const minPrice = toOptionalNumber(query.min_price);
  const maxPrice = toOptionalNumber(query.max_price);
  const sort = query.sort ?? "newest";

  const [categories, productsResult] = await Promise.all([
    listCategoriesPublic({ page: 1, limit: 100 }),
    listProductsPublic({
      page,
      limit: PAGE_SIZE,
      keyword,
      category_id: category.id,
      min_price: minPrice,
      max_price: maxPrice,
      sort,
      is_active: true,
    }),
  ]);

  const subcategories = categories
    .filter((item) => item.level === 2 && item.is_active && item.parent_id === category.id)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const productStocks = await listProductStocksPublic(productsResult.items.map((item) => item.id)).catch(() => []);
  const stockByProductId = productStocks.reduce<Record<string, number>>((acc, item) => {
    acc[item.product_id] = item.available_stock;
    return acc;
  }, {});
  const productsWithFreshStock = productsResult.items.map((item) => ({
    ...item,
    available_stock: stockByProductId[item.id] ?? item.available_stock,
  }));

  const totalPages = Math.max(1, Math.ceil(productsResult.pagination.total / productsResult.pagination.limit));
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);
  const queryForPage = (targetPage: number) =>
    new URLSearchParams({
      page: String(targetPage),
      ...(keyword ? { keyword } : {}),
      ...(minPrice !== undefined ? { min_price: String(minPrice) } : {}),
      ...(maxPrice !== undefined ? { max_price: String(maxPrice) } : {}),
      ...(sort ? { sort } : {}),
    }).toString();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Category</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{category.name}</h1>
      </header>

      <section className="mb-6 flex flex-wrap gap-2">
        {subcategories.map((sub) => (
          <Link
            key={sub.id}
            href={`/categories/${encodeURIComponent(category.slug)}/${encodeURIComponent(sub.slug)}`}
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            {sub.name}
          </Link>
        ))}
      </section>

      {productsWithFreshStock.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-600">
          Chưa có sản phẩm trong danh mục này.
        </div>
      ) : (
        <section>
          <div className="mb-4 text-sm text-stone-600">
            Hiển thị {productsWithFreshStock.length} / {productsResult.pagination.total} sản phẩm
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {productsWithFreshStock.map((product) => (
              <ProductGridCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <nav className="mt-8 flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4">
        <Link
          href={`/categories/${encodeURIComponent(category.slug)}?${queryForPage(previousPage)}`}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            page <= 1
              ? "pointer-events-none border-stone-200 text-stone-400"
              : "border-stone-300 text-stone-800 hover:bg-stone-100"
          }`}
        >
          Trang trước
        </Link>
        <span className="text-sm text-stone-600">
          Trang {page} / {totalPages}
        </span>
        <Link
          href={`/categories/${encodeURIComponent(category.slug)}?${queryForPage(nextPage)}`}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            page >= totalPages
              ? "pointer-events-none border-stone-200 text-stone-400"
              : "border-stone-300 text-stone-800 hover:bg-stone-100"
          }`}
        >
          Trang sau
        </Link>
      </nav>
    </div>
  );
}
