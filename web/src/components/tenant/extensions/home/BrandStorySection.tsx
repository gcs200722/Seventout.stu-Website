import Image from "next/image";

type BrandStorySectionProps = {
  image: string;
  line1: string;
  line2: string;
};

export function BrandStorySection({ image, line1, line2 }: BrandStorySectionProps) {
  return (
    <section className="w-full bg-sevenout-muted px-4 py-20 sm:px-8 lg:px-12 lg:py-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl lg:max-w-md lg:shrink-0">
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 1024px) 100vw, 28rem"
            className="object-cover transition duration-500 ease-out hover:scale-[1.03] hover:brightness-95"
            role="presentation"
          />
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <p className="font-sevenout-serif text-3xl font-semibold leading-snug tracking-wide text-sevenout-black sm:text-4xl lg:text-5xl">
            {line1}
          </p>
          <p className="mt-4 font-sevenout-serif text-xl font-medium tracking-wide text-neutral-600 sm:text-2xl">
            {line2}
          </p>
        </div>
      </div>
    </section>
  );
}
