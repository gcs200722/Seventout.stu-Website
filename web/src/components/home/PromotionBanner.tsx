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
  ctaHref = "/collections",
}: PromotionBannerProps) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="animate-fade-in rounded-3xl bg-gradient-to-r from-amber-200 via-orange-200 to-rose-200 px-6 py-10 text-stone-900 sm:px-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700">Limited Offer</p>
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm text-stone-700 sm:text-base">{description}</p>
        <Link
          href={ctaHref}
          className="mt-6 inline-flex rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-stone-700"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
