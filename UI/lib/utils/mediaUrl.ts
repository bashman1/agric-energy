// ============================================================
// Resolve a stored media path to something the browser can load.
//
// Uploads are stored ROOT-RELATIVE ("/storage/uploads/images/x.jpg"). That is
// what makes one database row correct in every environment: nginx serves the
// API, the frontend and /storage from a single origin, so the path resolves
// wherever the site is deployed, and moving to a new domain breaks nothing.
//
// `next dev` is the one exception — the dev server is on :3000 while Laravel
// and its /storage live on :8000, so a relative path would ask the Next dev
// server for a file it has never heard of. Re-attach the API origin there.
// Same split, and the same fix, as the API base in lib/api/client.ts.
// ============================================================

/**
 * Origin to prefix relative media with, or "" when media is same-origin.
 *
 * NEXT_PUBLIC_API_URL is absolute only in split dev mode; the production and
 * static-export builds bake the relative "/api/v1", which yields "" here.
 */
const MEDIA_ORIGIN = (() => {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  if (!/^https?:\/\//i.test(base)) return "";
  try {
    return new URL(base).origin;
  } catch {
    return "";
  }
})();

/**
 * A stored media value, made loadable.
 *
 * Only `/storage/…` is rewritten — that is the one prefix Laravel serves.
 * Frontend assets that are also root-relative (`/defaults/cover-*.svg`,
 * `/covers/*.svg`) belong to whoever is serving the frontend, so pointing them
 * at the API origin would break them in exactly the dev mode this exists for.
 *
 * Left untouched: absolute URLs (a partner logo hosted on someone else's site,
 * and rows still holding a legacy absolute upload URL) and data: URIs.
 */
export function mediaUrl(value: string | null | undefined): string {
  if (!value) return "";
  const v = value.trim();
  if (!v || !v.startsWith("/storage/")) return v;
  return MEDIA_ORIGIN ? MEDIA_ORIGIN + v : v;
}
