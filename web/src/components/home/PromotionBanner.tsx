import Link from "next/link";

type PromotionBannerProps = {
  title: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string;
};

export function PromotionBanner({
  title,
  description,
  ctaLabel,
  ctaHref = "/products",
}: PromotionBannerProps) {
  return (
    <section className="w-full bg-sevenout-muted px-0 py-10 sm:py-14">
      <div className="animate-fade-in w-full bg-gradient-to-br from-sevenout-black via-neutral-900 to-sevenout-burgundy px-6 py-14 text-sevenout-white sm:px-12 sm:py-16 lg:px-16">
        <div className="mx-auto max-w-4xl text-center lg:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sevenout-gold">Campaign</p>
          <h2 className="mt-4 font-sevenout-serif text-3xl font-semibold tracking-wide sm:text-4xl md:text-5xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base lg:mx-0">
            {description}
          </p>
          <Link
            href={ctaHref}
            className="mt-8 inline-flex rounded-full bg-sevenout-white px-8 py-3.5 text-sm font-semibold tracking-wide text-sevenout-black transition hover:scale-[1.02] hover:opacity-95"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
