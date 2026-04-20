import Image from "next/image";
import Link from "next/link";

import type { Collection } from "@/components/home/CollectionCard";

type EditorialCollectionCardProps = {
  collection: Collection;
};

export function EditorialCollectionCard({ collection }: EditorialCollectionCardProps) {
  return (
    <article className="group relative isolate h-full min-h-[240px] overflow-hidden rounded-2xl bg-neutral-200 focus-within:ring-2 focus-within:ring-sevenout-gold focus-within:ring-offset-2 focus-within:ring-offset-sevenout-muted">
      <Image
        src={collection.image}
        alt=""
        fill
        unoptimized
        loading="lazy"
        sizes="(max-width: 768px) 100vw, 45vw"
        className="object-cover transition duration-500 ease-out group-hover:scale-105 group-hover:brightness-90 group-focus-within:scale-105 group-focus-within:brightness-90"
        role="presentation"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-sevenout-black/75 via-sevenout-black/20 to-transparent opacity-90 transition duration-300 group-hover:opacity-100 group-focus-within:opacity-100"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 z-[1] flex flex-col justify-end p-6 sm:p-8">
        <h3 className="translate-y-1 font-sevenout-serif text-2xl font-semibold tracking-wide text-sevenout-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100 sm:text-3xl">
          {collection.title}
        </h3>
        <p className="mt-3 translate-y-2 text-sm font-semibold tracking-wide text-sevenout-gold opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
          {collection.cta}
        </p>
      </div>
      <Link
        href={collection.slug}
        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sevenout-gold"
      >
        <span className="sr-only">
          {collection.title} — {collection.cta}
        </span>
      </Link>
    </article>
  );
}
