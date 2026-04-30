type CmsRichTextBlockProps = {
  html: string;
  className?: string;
};

/** HTML was sanitized on the API when the block was saved (`RICH_TEXT`). */
export function CmsRichTextBlock({ html, className }: CmsRichTextBlockProps) {
  if (!html.trim()) return null;
  return (
    <div
      className={
        className ??
        "cms-rich-text mx-auto max-w-3xl space-y-4 px-4 py-12 text-base leading-relaxed text-neutral-800 sm:px-6 [&_a]:text-sevenout-black [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-sevenout-gold [&_blockquote]:pl-4 [&_h2]:font-sevenout-serif [&_h2]:text-2xl [&_h3]:font-sevenout-serif [&_h3]:text-xl [&_ul]:list-disc [&_ul]:pl-5"
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
