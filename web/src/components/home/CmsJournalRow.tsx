import Image from "next/image";
import Link from "next/link";

export type CmsJournalEntry = { title: string; href: string; cover: string };

export function CmsJournalRow({ entries }: { entries: CmsJournalEntry[] }) {
  if (entries.length === 0) {
    return null;
  }
  return (
    <section className="w-full bg-sevenout-white px-4 py-14 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="flex gap-6 overflow-x-auto pb-2 [scrollbar-width:thin]">
          {entries.map((e, i) => (
            <Link
              key={`${e.href}-${i}`}
              href={e.href}
              className="group relative min-w-[220px] max-w-[260px] flex-1 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"
            >
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={e.cover}
                  alt={e.title}
                  fill
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                  sizes="260px"
                />
              </div>
              <div className="p-4">
                <p className="font-sevenout-serif text-base font-semibold tracking-wide text-sevenout-black group-hover:underline">
                  {e.title}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
