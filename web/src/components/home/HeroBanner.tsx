import Image from "next/image";
import Link from "next/link";

type HeroBannerProps = {
  title: string;
  subtitle: string;
  ctaLabel: string;
  /** Mặc định: anchor tới sản phẩm nổi bật trên cùng trang */
  ctaHref?: string;
  image: string;
};

export function HeroBanner({ title, subtitle, ctaLabel, ctaHref = "#best-selling", image }: HeroBannerProps) {
  return (
    <section className="relative isolate flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-sevenout-black pt-[env(safe-area-inset-top)]">
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover brightness-[0.85]"
        role="presentation"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-sevenout-black/50 via-sevenout-black/35 to-sevenout-black/70"
        aria-hidden
      />
      <div className="animate-fade-in relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pb-24 text-center sm:px-10">
        <p className="font-sevenout-serif text-sm font-medium uppercase tracking-[0.35em] text-sevenout-gold sm:text-base">
          Sevenout
        </p>
        <h1 className="mt-6 font-sevenout-serif text-4xl font-semibold leading-[1.05] tracking-tight text-sevenout-white sm:text-6xl md:text-7xl">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-6 max-w-xl text-sm leading-relaxed tracking-wide text-white/85 sm:text-base">{subtitle}</p>
        ) : null}
        <div className="mt-10">
          <Link
            href={ctaHref}
            className="inline-flex items-center rounded-full bg-sevenout-black px-8 py-3.5 text-sm font-semibold tracking-wide text-sevenout-white ring-1 ring-white/20 transition hover:scale-[1.02] hover:opacity-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sevenout-gold"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
