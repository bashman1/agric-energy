// ============================================================
// Slug Utility
// ============================================================

/**
 * Generate a URL-safe slug from any string.
 * e.g. "Solar Water Pumping" → "solar-water-pumping"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/--+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Ensure slug is unique by appending a counter if needed.
 * Pass existingSlugs to check against.
 */
export function uniqueSlug(base: string, existingSlugs: string[]): string {
  let slug = slugify(base);
  let counter = 1;
  while (existingSlugs.includes(slug)) {
    slug = `${slugify(base)}-${counter}`;
    counter++;
  }
  return slug;
}
