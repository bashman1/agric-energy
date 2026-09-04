import { mediaUrl } from "@/lib/utils/mediaUrl";

// Brand-themed default cover images, used wherever content has no photo of
// its own (hero deck, cards). SVGs in UI/public/defaults are copied to the web
// root, so they resolve at /defaults/*.svg in the static export.
export const DEFAULT_COVERS = [
  "/defaults/cover-solar.svg",
  "/defaults/cover-crop.svg",
  "/defaults/cover-water.svg",
] as const;

/**
 * Pick a default cover deterministically from a seed (e.g. a slug) so the same
 * record always gets the same image, while different records vary across the set.
 */
export function defaultCover(seed: string | number): string {
  const n =
    typeof seed === "number"
      ? seed
      : [...String(seed)].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return DEFAULT_COVERS[Math.abs(n) % DEFAULT_COVERS.length];
}

/**
 * A record's own image if set, otherwise a stable brand default.
 *
 * The record's own value goes through mediaUrl() because it may be an upload
 * that Laravel serves; the defaults never do — they are frontend assets.
 */
export function coverImage(featuredImage: string | undefined | null, seed: string | number): string {
  return featuredImage && featuredImage.trim()
    ? mediaUrl(featuredImage)
    : defaultCover(seed);
}
