import Image from "next/image";

export type LookbookImage = {
  src: string;
  alt: string;
};

type LookbookGridProps = {
  images: [LookbookImage, LookbookImage, LookbookImage];
};

export function LookbookGrid({ images }: LookbookGridProps) {
  const [main, a, b] = images;
  return (
    <section className="w-full bg-sevenout-white px-4 py-16 sm:px-6 lg:px-10 lg:py-24" aria-label="Lookbook">
      <div className="mx-auto max-w-7xl">
        <p className="mb-10 text-center text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
          Lookbook
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:grid-rows-2 md:gap-5">
          <div className="relative aspect-[3/4] min-h-[280px] overflow-hidden rounded-2xl md:col-span-7 md:row-span-2 md:min-h-[520px]">
            <Image
              src={main.src}
              alt={main.alt}
              fill
              sizes="(max-width: 768px) 100vw, 58vw"
              className="object-cover transition duration-500 ease-out hover:scale-105 hover:brightness-90"
            />
          </div>
          <div className="relative aspect-[4/5] min-h-[200px] overflow-hidden rounded-2xl md:col-span-5 md:row-span-1 md:min-h-0">
            <Image
              src={a.src}
              alt={a.alt}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover transition duration-500 ease-out hover:scale-105 hover:brightness-90"
            />
          </div>
          <div className="relative aspect-[4/5] min-h-[200px] overflow-hidden rounded-2xl md:col-span-5 md:row-span-1 md:min-h-0">
            <Image
              src={b.src}
              alt={b.alt}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover transition duration-500 ease-out hover:scale-105 hover:brightness-90"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
