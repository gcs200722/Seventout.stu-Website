type CmsQuoteBlockProps = {
  text: string;
  attribution: string;
};

export function CmsQuoteBlock({ text, attribution }: CmsQuoteBlockProps) {
  return (
    <figure className="mx-auto max-w-4xl px-6 py-20 text-center sm:px-10 sm:py-28">
      <blockquote className="font-sevenout-serif text-3xl font-semibold leading-snug tracking-wide text-sevenout-black sm:text-4xl md:text-5xl">
        &ldquo;{text}&rdquo;
      </blockquote>
      {attribution.trim() ? (
        <figcaption className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-sevenout-gold">
          {attribution}
        </figcaption>
      ) : null}
    </figure>
  );
}
