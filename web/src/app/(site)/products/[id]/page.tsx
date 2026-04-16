import Link from "next/link";
import { notFound } from "next/navigation";

import { ProductImageGallery } from "@/components/products/ProductImageGallery";
import { formatVnd, getProductByIdPublic } from "@/lib/products-api";

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
        <ProductImageGallery images={images} productName={product.name} />

        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">{product.category.name}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-stone-900">{product.name}</h1>
          <p className="mt-4 text-2xl font-bold text-stone-900">{formatVnd(product.price)}</p>
          <p className="mt-5 text-sm leading-relaxed text-stone-600">
            {product.description?.trim().length > 0 ? product.description : "Sản phẩm chưa có mô tả chi tiết."}
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-stone-700"
            >
              Add to cart
            </button>
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
