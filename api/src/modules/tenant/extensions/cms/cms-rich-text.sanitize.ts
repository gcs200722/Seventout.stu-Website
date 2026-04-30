import sanitizeHtml from 'sanitize-html';

/**
 * Server-side HTML allowlist for CMS `RICH_TEXT` blocks (published to storefront).
 * Pair with strict CSP on the web app where possible.
 */
export function sanitizeCmsRichTextHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'u',
      'a',
      'ul',
      'ol',
      'li',
      'h2',
      'h3',
      'h4',
      'blockquote',
      'span',
      'hr',
    ],
    allowedAttributes: {
      a: ['href', 'rel', 'target'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
