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

export function useAsync<T>(
  loader: () => Promise<T>,
  deps: readonly unknown[] = []
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
    let cancelled = false;
    setLoading(true);
    setError(undefined);

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
  }, [run, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { data, loading, error, reload };
}
