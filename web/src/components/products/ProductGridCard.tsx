import Link from "next/link";

import type { ProductListItem } from "@/lib/products-api";
import { formatVnd } from "@/lib/products-api";

type ProductGridCardProps = {
  product: ProductListItem;
};

export function ProductGridCard({ product }: ProductGridCardProps) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="relative aspect-[4/5] overflow-hidden bg-stone-100">
        {/* eslint-disable-next-line @next/next/no-img-element -- Presigned URL dynamic host */}
        <img
          src={product.thumbnail}
          alt={product.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>

      <div className="space-y-2 p-4">
        <p className="text-xs uppercase tracking-[0.15em] text-stone-500">{product.category.name}</p>
        <h3 className="line-clamp-2 text-sm font-semibold text-stone-900">{product.name}</h3>
        <p className="text-base font-bold text-stone-900">{formatVnd(product.price)}</p>
        <Link
          href={`/products/${product.id}`}
          className="inline-flex rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-stone-800 transition hover:bg-stone-900 hover:text-white"
        >
          Xem chi tiết
        </Link>
      </div>
    </article>
  );
}
