import Link from "next/link";

import { Product, ProductCard } from "./ProductCard";

type ProductSectionProps = {
  id?: string;
  title: string;
  subtitle: string;
  products: Product[];
  /** Landing editorial vs dense retail cards */
  cardVariant?: "retail" | "editorial";
  viewMoreHref?: string;
  viewMoreLabel?: string;
};

export function ProductSection({
  id,
  title,
  subtitle,
  products,
  cardVariant = "retail",
  viewMoreHref = "/products",
  viewMoreLabel = "Xem thêm",
}: ProductSectionProps) {
  const gridClass =
    cardVariant === "editorial"
      ? "grid grid-cols-2 gap-5 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4"
      : "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4";

  return (
    <section id={id} className="w-full bg-sevenout-muted px-4 py-16 sm:px-8 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 sm:mb-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-sevenout-serif text-3xl font-semibold tracking-wide text-sevenout-black sm:text-4xl">
              {title}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed tracking-wide text-neutral-600 sm:text-base">
              {subtitle}
            </p>
          </div>
          <Link
            href={viewMoreHref}
            className="shrink-0 text-sm font-semibold tracking-wide text-sevenout-black underline decoration-sevenout-gold/60 decoration-1 underline-offset-4 transition hover:decoration-sevenout-gold"
          >
            {viewMoreLabel}
          </Link>
        </div>
        <div className={gridClass}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} variant={cardVariant} />
          ))}
        </div>
      </div>
    </section>
  );
}
