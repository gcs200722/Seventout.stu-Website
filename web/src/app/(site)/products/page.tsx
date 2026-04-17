import Link from "next/link";

import { ProductGridCard } from "@/components/products/ProductGridCard";
import { listCategoriesPublic } from "@/lib/categories-api";
import { listProductStocksPublic, listProductsPublic, type ProductSort } from "@/lib/products-api";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    keyword?: string;
    category_id?: string;
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

export default async function ProductsPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const page = toPositiveInt(query.page, 1);
  const keyword = query.keyword?.trim() || undefined;
  const categoryId = query.category_id?.trim() || undefined;
  const minPrice = toOptionalNumber(query.min_price);
  const maxPrice = toOptionalNumber(query.max_price);
  const sort = query.sort ?? "newest";

  const [categories, productsResult] = await Promise.all([
    listCategoriesPublic({ page: 1, limit: 100 }),
    listProductsPublic({
      page,
      limit: PAGE_SIZE,
      keyword,
      category_id: categoryId,
      min_price: minPrice,
      max_price: maxPrice,
      sort,
      is_active: true,
    }),
  ]);
  const productStocks = await listProductStocksPublic(productsResult.items.map((item) => item.id)).catch(() => []);
  const stockByProductId = productStocks.reduce<Record<string, number>>((acc, item) => {
    acc[item.product_id] = item.available_stock;
    return acc;
  }, {});
  const productsWithFreshStock = productsResult.items.map((item) => ({
    ...item,
    available_stock: stockByProductId[item.id] ?? item.available_stock,
  }));

  const subcategories = categories
    .filter((item) => item.level === 2 && item.is_active)
    .sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const totalPages = Math.max(1, Math.ceil(productsResult.pagination.total / productsResult.pagination.limit));
  const previousPage = Math.max(1, page - 1);
  const nextPage = Math.min(totalPages, page + 1);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Product Catalog</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Cửa hàng sản phẩm</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Khám phá các sản phẩm local brand theo danh mục, khoảng giá và từ khóa.
        </p>
      </header>

      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <form className="grid gap-3 md:grid-cols-2 lg:grid-cols-5" method="GET">
          <input
            type="search"
            name="keyword"
            defaultValue={keyword}
            placeholder="Tìm theo tên sản phẩm"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black placeholder:text-black outline-none focus:border-stone-800"
          />
          <select
            name="category_id"
            defaultValue={categoryId ?? ""}
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black outline-none focus:border-stone-800"
          >
            <option value="">Tất cả danh mục</option>
            {subcategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            name="min_price"
            defaultValue={minPrice}
            placeholder="Giá từ"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black placeholder:text-black outline-none focus:border-stone-800"
          />
          <input
            type="number"
            min={0}
            name="max_price"
            defaultValue={maxPrice}
            placeholder="Giá đến"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black placeholder:text-black outline-none focus:border-stone-800"
          />
          <select
            name="sort"
            defaultValue={sort}
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black outline-none focus:border-stone-800"
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
          <input type="hidden" name="page" value="1" />
          <div className="md:col-span-2 lg:col-span-5 flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              Áp dụng bộ lọc
            </button>
            <Link
              href="/products"
              className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              Đặt lại
            </Link>
          </div>
        </form>
      </section>

      {productsResult.items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-600">
          Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <section>
          <div className="mb-4 text-sm text-stone-600">
            Hiển thị {productsResult.items.length} / {productsResult.pagination.total} sản phẩm
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
          href={`/products?${new URLSearchParams({
            page: String(previousPage),
            ...(keyword ? { keyword } : {}),
            ...(categoryId ? { category_id: categoryId } : {}),
            ...(minPrice !== undefined ? { min_price: String(minPrice) } : {}),
            ...(maxPrice !== undefined ? { max_price: String(maxPrice) } : {}),
            ...(sort ? { sort } : {}),
          }).toString()}`}
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
          href={`/products?${new URLSearchParams({
            page: String(nextPage),
            ...(keyword ? { keyword } : {}),
            ...(categoryId ? { category_id: categoryId } : {}),
            ...(minPrice !== undefined ? { min_price: String(minPrice) } : {}),
            ...(maxPrice !== undefined ? { max_price: String(maxPrice) } : {}),
            ...(sort ? { sort } : {}),
          }).toString()}`}
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
