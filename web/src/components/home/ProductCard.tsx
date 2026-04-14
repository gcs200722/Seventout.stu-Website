import Image from "next/image";

export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
};

type ProductCardProps = {
  product: Product;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ProductCard({ product }: ProductCardProps) {
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const discountPercent = hasDiscount
    ? Math.round((((product.originalPrice ?? 0) - product.price) / (product.originalPrice ?? 1)) * 100)
    : 0;

  return (
    <article className="group animate-fade-in overflow-hidden rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
      <div className="relative mb-4 h-64 w-full overflow-hidden rounded-xl bg-stone-100">
        <Image
          src={product.image}
          alt={product.name}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
        {hasDiscount ? (
          <span className="absolute left-3 top-3 rounded-full bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white">
            -{discountPercent}%
          </span>
        ) : null}
      </div>
      <div className="space-y-2 px-1 pb-1">
        <h3 className="line-clamp-2 text-sm font-semibold text-stone-900 sm:text-base">{product.name}</h3>
        <div className="flex items-center gap-2">
          <p className="text-base font-bold text-stone-900">{formatPrice(product.price)}</p>
          {hasDiscount ? (
            <p className="text-xs text-stone-500 line-through">{formatPrice(product.originalPrice as number)}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="mt-2 inline-flex w-full items-center justify-center rounded-full bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700"
        >
          Add to cart
        </button>
      </div>
    </article>
  );
}
