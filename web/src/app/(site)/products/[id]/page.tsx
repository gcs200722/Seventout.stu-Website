import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { PromotionConditionsHint } from "@/components/promotions/PromotionConditionsHint";
import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { formatVnd, getProductByIdPublic, getProductStockPublic } from "@/lib/products-api";

type PageProps = {
  params: Promise<{ id: string }>;
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;

  let product: Awaited<ReturnType<typeof getProductByIdPublic>> | null = null;
  try {
    product = await getProductByIdPublic(id);
  } catch {
    product = null;
  }

  if (!product) {
    notFound();
  }

  const images = product.images.length > 0 ? product.images : [FALLBACK_IMAGE];
  const freshStock = await getProductStockPublic(product.id).catch(() => null);
  const availableStock = freshStock?.available_stock ?? product.available_stock;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-6 text-xs text-stone-500">
        <Link href="/products" className="hover:text-stone-800">
          Sản phẩm
        </Link>
        <span className="mx-2">/</span>
        <span className="text-stone-800">{product.name}</span>
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
            {availableStock > 0 ? `Tồn kho: ${availableStock}` : "Tạm hết hàng"}
          </p>
          <p className="mt-5 text-sm leading-relaxed text-stone-600">
            {product.description?.trim().length > 0 ? product.description : "Sản phẩm chưa có mô tả chi tiết."}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <AddToCartButton productId={product.id} />
            <Link
              href={`/products?category_id=${product.category.id}`}
              className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 transition hover:bg-stone-100"
            >
              Xem cùng danh mục
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
