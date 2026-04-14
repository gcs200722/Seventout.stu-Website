import Image from "next/image";
import Link from "next/link";

type HeroBannerProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  image: string;
};

export function HeroBanner({ title, subtitle, ctaLabel, image }: HeroBannerProps) {
  return (
    <section className="mx-auto mt-6 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="animate-fade-in grid overflow-hidden rounded-3xl bg-stone-100 md:grid-cols-2">
        <div className="flex flex-col justify-center gap-5 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-600">
            Local Brand Edition
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl lg:text-5xl">
            {title}
          </h1>
          <p className="max-w-lg text-sm text-stone-600 sm:text-base">{subtitle}</p>
          <div>
            <Link
              href="#best-selling"
              className="inline-flex items-center rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-700"
            >
              {ctaLabel}
            </Link>
          </div>
        </div>
        <div className="relative min-h-72">
          <Image
            src={image}
            alt="Hero fashion collection"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
