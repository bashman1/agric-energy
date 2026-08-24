// ============================================================
// useAsync — run an async loader on mount and track its state.
//
// The admin area fetched everything server-side before the static build;
// with no server, each page loads its own data in the browser. This is
// the one place that pattern lives, so loading and error handling stay
// consistent across ~28 pages.
// ============================================================
"use client";

import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | undefined;
  /** Re-run the loader (after a save, or to retry a failure). */
  reload: () => void;
}

export interface AsyncOptions {
  /**
   * Hold off until the loader has what it needs.
   *
   * While false the hook stays in its loading state and never calls the
   * loader — it does NOT settle as "loaded nothing", which would flash a
   * not-found page. Detail pages use this: on a static export the slug is
   * only knowable once the component is running in the browser (see
   * lib/routing/useRouteSlug), and firing a request for the sentinel in the
   * meantime would 404 on every page load.
   */
  enabled?: boolean;
}

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = [],
  { enabled = true }: AsyncOptions = {}
): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();
  const [nonce, setNonce] = useState(0);

  // The loader is almost always an inline arrow, so depend on the caller's
  // deps rather than on the function identity — otherwise every render
  // would refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    run()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [run, nonce, enabled]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}
