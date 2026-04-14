import Image from "next/image";
import Link from "next/link";

export type Collection = {
  id: string;
  title: string;
  cta: string;
  slug: string;
  image: string;
};

type CollectionCardProps = {
  collection: Collection;
};

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <article className="group animate-fade-in overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={collection.image}
          alt={collection.title}
          fill
          loading="lazy"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
          className="object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="space-y-3 p-5">
        <h3 className="text-lg font-semibold text-stone-900">{collection.title}</h3>
        <Link
          href={collection.slug}
          className="inline-flex items-center text-sm font-semibold text-stone-700 transition-colors hover:text-stone-950"
        >
          {collection.cta} →
        </Link>
      </div>
    </article>
  );
}
