import Link from "next/link";

import { Product, ProductCard } from "./ProductCard";

type ProductSectionProps = {
  id?: string;
  title: string;
  subtitle: string;
  products: Product[];
};

export function ProductSection({ id, title, subtitle, products }: ProductSectionProps) {
  return (
    <section id={id} className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl">{title}</h2>
          <p className="mt-2 text-sm text-stone-600">{subtitle}</p>
        </div>
        <Link
          href="#"
          className="shrink-0 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-900 hover:text-white"
        >
          View More
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
