import { ProductsCatalogClient } from "@/components/products/ProductsCatalogClient";
import { findCategoryBySlug, listCategoriesPublic } from "@/lib/categories-api";
import { listProductStocksPublic, listProductsPublic, type ProductSort } from "@/lib/products-api";

type PageProps = {
  searchParams: Promise<{
    page?: string;
    keyword?: string;
    category_id?: string;
    category_slug?: string;
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
  const categorySlug = query.category_slug?.trim() || undefined;
  const categoryBySlug = categorySlug ? await findCategoryBySlug(categorySlug) : null;
  const categoryId = categoryBySlug?.id ?? undefined;
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

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Product Catalog</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">Cửa hàng sản phẩm</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Khám phá các sản phẩm local brand theo danh mục, khoảng giá và từ khóa.
        </p>
      </header>

      <ProductsCatalogClient
        categories={categories}
        initialFilters={{
          keyword,
          categorySlug: categoryBySlug?.level === 2 ? categoryBySlug.slug : undefined,
          minPrice,
          maxPrice,
          sort,
          page,
        }}
        initialData={{
          items: productsWithFreshStock,
          pagination: productsResult.pagination,
        }}
      />
    </div>
  );
}
