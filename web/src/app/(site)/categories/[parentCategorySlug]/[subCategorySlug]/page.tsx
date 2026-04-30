import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductGridCard } from "@/components/tenant/extensions/products/ProductGridCard";
import { findCategoryBySlug } from "@/lib/categories-api";
import { listProductStocksPublic, listProductsPublic, type ProductSort } from "@/lib/products-api";

type PageProps = {
  params: Promise<{ parentCategorySlug: string; subCategorySlug: string }>;
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

export default async function SubCategoryPage({ params, searchParams }: PageProps) {
  const { parentCategorySlug, subCategorySlug } = await params;
  const query = await searchParams;
  const [parentCategory, subCategory] = await Promise.all([
    findCategoryBySlug(parentCategorySlug),
    findCategoryBySlug(subCategorySlug),
  ]);

  if (
    !parentCategory ||
    parentCategory.level !== 1 ||
    !parentCategory.is_active ||
    !subCategory ||
    subCategory.level !== 2 ||
    !subCategory.is_active ||
    subCategory.parent_id !== parentCategory.id
  ) {
    notFound();
  }

  const page = toPositiveInt(query.page, 1);
  const keyword = query.keyword?.trim() || undefined;
  const minPrice = toOptionalNumber(query.min_price);
  const maxPrice = toOptionalNumber(query.max_price);
  const sort = query.sort ?? "newest";

  const productsResult = await listProductsPublic({
    page,
    limit: PAGE_SIZE,
    keyword,
    category_id: subCategory.id,
    min_price: minPrice,
    max_price: maxPrice,
    sort,
    is_active: true,
  });

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
      <nav className="mb-6 text-xs text-stone-500">
        <Link href={`/categories/${encodeURIComponent(parentCategory.slug)}`} className="hover:text-stone-800">
          {parentCategory.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">{subCategory.name}</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Subcategory</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{subCategory.name}</h1>
      </header>

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
          href={`/categories/${encodeURIComponent(parentCategory.slug)}/${encodeURIComponent(subCategory.slug)}?${queryForPage(previousPage)}`}
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
          href={`/categories/${encodeURIComponent(parentCategory.slug)}/${encodeURIComponent(subCategory.slug)}?${queryForPage(nextPage)}`}
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
