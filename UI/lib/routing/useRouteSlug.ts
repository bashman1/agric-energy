"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { SHELL_SLUG } from "./shell";

/**
 * The slug this page should actually load.
 *
 * On a prerendered path the route param is already right. On the shell (see
 * shell.ts) it is the sentinel, and the real slug is only knowable from the
 * address the visitor asked for — so the URL is the authority in both cases.
 *
 * Returns null until the component is running in the browser. That is what
 * keeps hydration honest: the exported HTML was built for the sentinel, so
 * resolving during the server pass would render one slug into the markup and
 * a different one on hydration. Callers treat null as "still loading", which
 * is the state the exported HTML already shows.
 */

// A store that never changes: false while rendering on the server, true once
// hydrated. The canonical mismatch-free way to ask "am I on the client".
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export function useRouteSlug(paramSlug: string): string | null {
  const pathname = usePathname();
  const isClient = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isClient) return null;

  // trailingSlash: true, so the last non-empty segment is the slug.
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const last = segments[segments.length - 1];

  const resolved = last && last !== SHELL_SLUG ? safeDecode(last) : paramSlug;

  // The sentinel reached the browser as a literal URL — there is no record
  // behind it, so say so rather than requesting "_entry" from the API.
  return resolved && resolved !== SHELL_SLUG ? resolved : null;
}

/** A malformed escape in the path must not throw during render. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
