// Sanitising for the rich-text fields (job summary, duties, competences).
//
// The API sanitises on write too. This is the second of the two gates: it
// covers records that predate the API rule and anything that reaches the
// browser by another route, and it costs nothing to keep.
//
// The allow-list is deliberately narrower than CKEditor's output vocabulary
// — no images, no tables, no inline styles, no ids. Everything the toolbar
// in RichTextEditorClient can produce survives; nothing else does.
import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s",
  "ul", "ol", "li",
  "h3", "h4",
  "blockquote",
  "a",
];

const ALLOWED_ATTR = ["href", "target", "rel"];

/**
 * Clean editor HTML for rendering.
 *
 * Returns "" on the server: DOMPurify needs a DOM, and every page that
 * calls this loads its record in the browser (useAsync), so the server pass
 * has nothing to show anyway.
 */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  if (typeof window === "undefined") return "";

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Block javascript:/data: URLs in links.
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
    RETURN_TRUSTED_TYPE: false,
  });
}

/**
 * True when the value contains no markup at all.
 *
 * These fields became rich text after the records existed, so most hold
 * plain text with real newlines. Rendering that as HTML would collapse
 * every paragraph into one run, so callers fall back to `whitespace-pre-line`
 * for it instead.
 */
export function isPlainText(html: string): boolean {
  return !/<[a-z][\s\S]*>/i.test(html);
}

/**
 * True when the value carries something a reader would see, so callers can
 * skip an empty heading. CKEditor serialises a cleared field as "<p>&nbsp;</p>"
 * rather than "", which is not emptiness any `if (value)` would catch.
 */
export function hasHtmlContent(html: string | null | undefined): boolean {
  if (!html) return false;
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length > 0;
}
