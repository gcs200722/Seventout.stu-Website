export type CmsMarqueeLogo = { src: string; alt: string; href: string };

export function CmsPressMarquee({ logos }: { logos: CmsMarqueeLogo[] }) {
  if (logos.length === 0) {
    return null;
  }
  const loop = [...logos, ...logos];
  return (
    <section className="w-full border-y border-neutral-200 bg-sevenout-muted/40 py-8">
      <div className="relative overflow-hidden">
        <div className="flex w-max animate-[cms-marquee_28s_linear_infinite] items-center gap-16 px-8">
          {loop.map((logo, i) => {
            const inner = (
              // eslint-disable-next-line @next/next/no-img-element -- remote CMS URLs
              <img src={logo.src} alt={logo.alt || "Partner"} className="h-10 w-auto max-w-[140px] object-contain opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0" />
            );
            return (
              <div key={`${logo.src}-${i}`} className="shrink-0">
                {logo.href ? (
                  <a href={logo.href} target="_blank" rel="noreferrer" className="block">
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </div>
            );
          })}
        </div>
      </div>
      <style>{`
        @keyframes cms-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
