import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductPurchasePanel } from "@/components/products/ProductPurchasePanel";
import { PromotionConditionsHint } from "@/components/promotions/PromotionConditionsHint";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { ProductReviewsSection } from "@/components/products/ProductReviewsSection";
import {
  buildProductHref,
  formatVnd,
  getProductBySlugPublic,
  getProductStockPublic,
} from "@/lib/products-api";
import {
  getProductReviewStatsPublic,
  listProductReviewsPublic,
  type ProductReview,
  type ProductReviewStats,
} from "@/lib/reviews-api";

type PageProps = {
  params: Promise<{
    parentCategorySlug: string;
    subCategorySlug: string;
    productSlug: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";

const emptyStats: ProductReviewStats = {
  average_rating: 0,
  total_reviews: 0,
  rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
};

export default async function ProductDetailCanonicalPage({ params, searchParams }: PageProps) {
  const { parentCategorySlug, subCategorySlug, productSlug } = await params;
  const sp = (await searchParams) ?? {};
  const rawOrder = sp.order_id;
  const orderIdForReview =
    typeof rawOrder === "string" && rawOrder.trim().length > 0 ? rawOrder.trim() : undefined;

  let product: Awaited<ReturnType<typeof getProductBySlugPublic>> | null = null;
  try {
    product = await getProductBySlugPublic(productSlug);
  } catch {
    product = null;
  }
  if (!product) {
    notFound();
  }

  if (
    product.category.parent?.slug !== parentCategorySlug ||
    product.category.slug !== subCategorySlug
  ) {
    notFound();
  }

  const canonicalPath = buildProductHref(product);
  if (
    canonicalPath !== `/categories/${parentCategorySlug}/${subCategorySlug}/${productSlug}`
  ) {
    notFound();
  }

  const images =
    Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : [FALLBACK_IMAGE];
  const productVariants = Array.isArray(product.variants) ? product.variants : [];
  const freshStock = await getProductStockPublic(product.id).catch(() => null);
  const availableStock = freshStock?.available_stock ?? product.available_stock;
  const freshStockVariants = Array.isArray(freshStock?.variants)
    ? freshStock.variants
    : [];
  const productForClient = freshStock
    ? {
        ...product,
        available_stock: freshStock.available_stock,
        variants: productVariants.map((v) => {
          const live = freshStockVariants.find(
            (x) => x.product_variant_id === v.id,
          );
          return { ...v, available_stock: live?.available_stock ?? v.available_stock };
        }),
      }
    : { ...product, variants: productVariants };

  let reviewStats = emptyStats;
  let reviewList: { items: ProductReview[]; pagination: { page: number; limit: number; total: number } } = {
    items: [],
    pagination: { page: 1, limit: 10, total: 0 },
  };
  try {
    const [stats, list] = await Promise.all([
      getProductReviewStatsPublic(product.id),
      listProductReviewsPublic(product.id, { page: 1, limit: 10, sort: "latest" }),
    ]);
    reviewStats = stats;
    reviewList = list;
  } catch {
    reviewStats = emptyStats;
    reviewList = { items: [], pagination: { page: 1, limit: 10, total: 0 } };
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-xs text-stone-500">
        <Link href="/products" className="hover:text-stone-800">
          Sản phẩm
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/categories/${encodeURIComponent(parentCategorySlug)}`}
          className="hover:text-stone-800"
        >
          {product.category.parent?.name}
        </Link>
        <span className="mx-2">/</span>
        <Link
          href={`/categories/${encodeURIComponent(parentCategorySlug)}/${encodeURIComponent(subCategorySlug)}`}
          className="hover:text-stone-800"
        >
          {product.category.name}
        </Link>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductImageGallery
          images={images}
          productName={product.name}
          campaignName={product.promotion?.campaign_name}
        />

        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{product.category.name}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{product.name}</h1>
          {product.promotion ? (
            <p className="mt-4 flex flex-wrap items-baseline gap-3">
              <span className="text-lg font-medium text-stone-400 line-through">{formatVnd(product.promotion.list_price)}</span>
              <span className="text-2xl font-bold text-stone-900">{formatVnd(product.promotion.sale_price)}</span>
            </p>
          ) : (
            <p className="mt-4 text-2xl font-bold text-stone-900">{formatVnd(product.price)}</p>
          )}
          <PromotionConditionsHint
            display={product.promotion?.conditions_display}
            className="mt-2 max-w-xl text-xs leading-relaxed text-stone-600"
          />
          <p className="mt-2 text-sm text-stone-600">
            {availableStock > 0 ? `Tổng tồn (tất cả mã): ${availableStock}` : "Tạm hết hàng"}
          </p>
          <p className="mt-5 text-sm leading-relaxed text-stone-600">
            {product.description?.trim().length > 0 ? product.description : "Sản phẩm chưa có mô tả chi tiết."}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <ProductPurchasePanel product={productForClient} />
            <Link
              href={`/categories/${encodeURIComponent(parentCategorySlug)}/${encodeURIComponent(subCategorySlug)}`}
              className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              Xem cùng danh mục
            </Link>
          </div>
        </div>
      </div>

      <ProductReviewsSection
        productId={product.id}
        initialStats={reviewStats}
        initialList={reviewList}
        orderIdForReview={orderIdForReview}
      />
    </div>
  );
}
