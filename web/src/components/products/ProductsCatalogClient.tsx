"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ProductGridCard } from "@/components/products/ProductGridCard";
import type { CategoryListItem } from "@/lib/categories-api";
import { listProductStocksPublic, listProductsPublic, type ProductListItem, type ProductSort } from "@/lib/products-api";

type CatalogFilters = {
  keyword?: string;
  categorySlug?: string;
  minPrice?: number;
  maxPrice?: number;
  sort: ProductSort;
  page: number;
};

type CatalogData = {
  items: ProductListItem[];
  pagination: { page: number; limit: number; total: number };
};

type ProductsCatalogClientProps = {
  categories: CategoryListItem[];
  initialFilters: CatalogFilters;
  initialData: CatalogData;
};

const PAGE_SIZE = 12;

function toOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
}

function parseFiltersFromSearch(search: string): CatalogFilters {
  const params = new URLSearchParams(search);
  const sort = (params.get("sort") as ProductSort | null) ?? "newest";
  const pageRaw = Number(params.get("page"));
  return {
    keyword: params.get("keyword")?.trim() || undefined,
    categorySlug: params.get("category_slug")?.trim() || undefined,
    minPrice: toOptionalNumber(params.get("min_price") ?? ""),
    maxPrice: toOptionalNumber(params.get("max_price") ?? ""),
    sort: sort === "price_asc" || sort === "price_desc" || sort === "newest" ? sort : "newest",
    page: Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

function buildSearchParams(filters: CatalogFilters): string {
  const params = new URLSearchParams();
  if (filters.keyword) params.set("keyword", filters.keyword);
  if (filters.categorySlug) params.set("category_slug", filters.categorySlug);
  if (filters.minPrice !== undefined) params.set("min_price", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("max_price", String(filters.maxPrice));
  if (filters.sort) params.set("sort", filters.sort);
  if (filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

export function ProductsCatalogClient({ categories, initialFilters, initialData }: ProductsCatalogClientProps) {
  const [filters, setFilters] = useState<CatalogFilters>(initialFilters);
  const [keywordInput, setKeywordInput] = useState(initialFilters.keyword ?? "");
  const [categoryInput, setCategoryInput] = useState(initialFilters.categorySlug ?? "");
  const [minInput, setMinInput] = useState(initialFilters.minPrice !== undefined ? String(initialFilters.minPrice) : "");
  const [maxInput, setMaxInput] = useState(initialFilters.maxPrice !== undefined ? String(initialFilters.maxPrice) : "");
  const [sortInput, setSortInput] = useState<ProductSort>(initialFilters.sort);
  const [data, setData] = useState<CatalogData>(initialData);
  const [loading, setLoading] = useState(false);

  const categoryBySlug = useMemo(
    () =>
      categories.reduce<Record<string, CategoryListItem>>((acc, category) => {
        acc[category.slug] = category;
        return acc;
      }, {}),
    [categories],
  );

  const subcategories = useMemo(
    () => categories.filter((item) => item.level === 2 && item.is_active).sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [categories],
  );

  const fetchByFilters = useCallback(
    async (nextFilters: CatalogFilters, replaceHistory = true) => {
      setLoading(true);
      try {
        const categoryId = nextFilters.categorySlug ? categoryBySlug[nextFilters.categorySlug]?.id : undefined;
        const productsResult = await listProductsPublic({
          page: nextFilters.page,
          limit: PAGE_SIZE,
          keyword: nextFilters.keyword,
          category_id: categoryId,
          min_price: nextFilters.minPrice,
          max_price: nextFilters.maxPrice,
          sort: nextFilters.sort,
          is_active: true,
        });

        const productStocks = await listProductStocksPublic(productsResult.items.map((item) => item.id)).catch(() => []);
        const stockByProductId = productStocks.reduce<Record<string, number>>((acc, item) => {
          acc[item.product_id] = item.available_stock;
          return acc;
        }, {});

        const withFreshStock = productsResult.items.map((item) => ({
          ...item,
          available_stock: stockByProductId[item.id] ?? item.available_stock,
        }));

        const nextData = {
          items: withFreshStock,
          pagination: productsResult.pagination,
        };
        setData(nextData);
        setFilters(nextFilters);

        if (replaceHistory) {
          const qs = buildSearchParams(nextFilters);
          const nextUrl = qs ? `/products?${qs}` : "/products";
          window.history.pushState(null, "", nextUrl);
        }
      } finally {
        setLoading(false);
      }
    },
    [categoryBySlug],
  );

  useEffect(() => {
    function onPopState() {
      const parsed = parseFiltersFromSearch(window.location.search);
      setKeywordInput(parsed.keyword ?? "");
      setCategoryInput(parsed.categorySlug ?? "");
      setMinInput(parsed.minPrice !== undefined ? String(parsed.minPrice) : "");
      setMaxInput(parsed.maxPrice !== undefined ? String(parsed.maxPrice) : "");
      setSortInput(parsed.sort);
      void fetchByFilters(parsed, false);
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [fetchByFilters]);

  const totalPages = Math.max(1, Math.ceil(data.pagination.total / data.pagination.limit));
  const previousPage = Math.max(1, filters.page - 1);
  const nextPage = Math.min(totalPages, filters.page + 1);

  return (
    <>
      <section className="mb-8 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <form
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-5"
          onSubmit={(event) => {
            event.preventDefault();
            void fetchByFilters({
              keyword: keywordInput.trim() || undefined,
              categorySlug: categoryInput || undefined,
              minPrice: toOptionalNumber(minInput),
              maxPrice: toOptionalNumber(maxInput),
              sort: sortInput,
              page: 1,
            });
          }}
        >
          <input
            type="search"
            name="keyword"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="Tìm theo tên sản phẩm"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black placeholder:text-black outline-none focus:border-stone-800"
          />
          <select
            name="category_slug"
            value={categoryInput}
            onChange={(event) => setCategoryInput(event.target.value)}
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black outline-none focus:border-stone-800"
          >
            <option value="">Tất cả danh mục</option>
            {subcategories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            name="min_price"
            value={minInput}
            onChange={(event) => setMinInput(event.target.value)}
            placeholder="Giá từ"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black placeholder:text-black outline-none focus:border-stone-800"
          />
          <input
            type="number"
            min={0}
            name="max_price"
            value={maxInput}
            onChange={(event) => setMaxInput(event.target.value)}
            placeholder="Giá đến"
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black placeholder:text-black outline-none focus:border-stone-800"
          />
          <select
            name="sort"
            value={sortInput}
            onChange={(event) => setSortInput(event.target.value as ProductSort)}
            className="rounded-xl border border-stone-300 px-3 py-2 text-sm text-black outline-none focus:border-stone-800"
          >
            <option value="newest">Mới nhất</option>
            <option value="price_asc">Giá tăng dần</option>
            <option value="price_desc">Giá giảm dần</option>
          </select>
          <div className="md:col-span-2 lg:col-span-5 flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={loading}
              className="rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Đang tải..." : "Áp dụng bộ lọc"}
            </button>
            <button
              type="button"
              onClick={() => {
                setKeywordInput("");
                setCategoryInput("");
                setMinInput("");
                setMaxInput("");
                setSortInput("newest");
                void fetchByFilters({ sort: "newest", page: 1 });
              }}
              className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              Đặt lại
            </button>
          </div>
        </form>
      </section>

      {data.items.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-10 text-center text-sm text-stone-600">
          Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại.
        </div>
      ) : (
        <section>
          <div className="mb-4 text-sm text-stone-600">
            Hiển thị {data.items.length} / {data.pagination.total} sản phẩm
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {data.items.map((product) => (
              <ProductGridCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <nav className="mt-8 flex items-center justify-between rounded-2xl border border-stone-200 bg-white p-4">
        <button
          type="button"
          disabled={filters.page <= 1 || loading}
          onClick={() => void fetchByFilters({ ...filters, page: previousPage })}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            filters.page <= 1 || loading
              ? "pointer-events-none border-stone-200 text-stone-400"
              : "border-stone-300 text-stone-800 hover:bg-stone-100"
          }`}
        >
          Trang trước
        </button>
        <span className="text-sm text-stone-600">
          Trang {filters.page} / {totalPages}
        </span>
        <button
          type="button"
          disabled={filters.page >= totalPages || loading}
          onClick={() => void fetchByFilters({ ...filters, page: nextPage })}
          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
            filters.page >= totalPages || loading
              ? "pointer-events-none border-stone-200 text-stone-400"
              : "border-stone-300 text-stone-800 hover:bg-stone-100"
          }`}
        >
          Trang sau
        </button>
      </nav>
    </>
  );
}
