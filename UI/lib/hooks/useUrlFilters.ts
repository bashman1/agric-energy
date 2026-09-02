// ============================================================
// useUrlFilters — keeps listing-page filters in the query string.
//
// The public listing pages used to read `searchParams` on the server and
// re-render. A static export prerenders each page once with no request,
// so filters move to the browser.
//
// Deliberately NOT useSearchParams(): in an export, that hook forces its
// whole Suspense subtree to bail to the fallback during prerender, so the
// page would ship as an empty shell and the list would exist only after
// hydration — silently losing the SEO these pages are prerendered for.
//
// Reading location.search in an effect instead means the prerender emits
// the FULL unfiltered list (good HTML for crawlers), and filters apply on
// mount for real visitors. history.replaceState keeps URLs shareable
// without triggering a navigation.
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";

export type Filters = Record<string, string | undefined>;

function readFromLocation(keys: readonly string[]): Filters {
  const search = new URLSearchParams(window.location.search);
  const out: Filters = {};
  for (const key of keys) out[key] = search.get(key) || undefined;
  return out;
}

/**
 * A <Link> to the SAME route with a different query string — the
 * `?type=job` opportunity tabs, the Individual/Organisation entries in the
 * header — navigates with history.pushState. That neither remounts the
 * component nor fires `popstate`, so the address bar changed while the
 * filters stayed on their mount-time values and the list never moved.
 *
 * Patching pushState once and re-broadcasting it closes that gap.
 * `replaceState` is deliberately left alone: setFilters() below uses it, and
 * echoing our own writes back would just re-render for no reason.
 */
const NAVIGATE_EVENT = "urlfilters:navigate";
let pushStatePatched = false;

function ensurePushStatePatched() {
  if (pushStatePatched || typeof window === "undefined") return;
  pushStatePatched = true;
  const original = window.history.pushState;
  window.history.pushState = function patched(
    ...args: Parameters<History["pushState"]>
  ) {
    const result = original.apply(this, args);
    window.dispatchEvent(new Event(NAVIGATE_EVENT));
    return result;
  };
}

export function useUrlFilters(keys: readonly string[]) {
  // Empty on the server and on first client render, so hydration matches
  // the prerendered HTML.
  const [filters, setState] = useState<Filters>({});

  useEffect(() => {
    ensurePushStatePatched();
    setState(readFromLocation(keys));

    // Back/forward should restore the filters they were captured with;
    // a same-route <Link> should apply the ones it carries.
    const reread = () => setState(readFromLocation(keys));
    window.addEventListener("popstate", reread);
    window.addEventListener(NAVIGATE_EVENT, reread);
    return () => {
      window.removeEventListener("popstate", reread);
      window.removeEventListener(NAVIGATE_EVENT, reread);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.join(",")]);

  const setFilters = useCallback((next: Filters) => {
    setState(next);
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `${window.location.pathname}?${qs}` : window.location.pathname
    );
  }, []);

  const clear = useCallback(() => setFilters({}), [setFilters]);

  return { filters, setFilters, clear };
}
