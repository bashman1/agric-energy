// ============================================================
// AdminDataPage — loads a page's data in the browser and renders it.
//
// Admin pages fetched server-side (with the session token) before the
// static build. There is no server now, so each page loads its own data
// on mount. This wrapper keeps the loading, error and empty states — and
// the document title — identical across the admin area.
//
// `metadata` cannot be exported from a client component, so the title is
// set here instead.
// ============================================================
"use client";

import { useEffect } from "react";
import { useAsync } from "@/lib/hooks/useAsync";

export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = `${title} | Agri-Energy Desk`;
  }, [title]);
}

export default function AdminDataPage<T>({
  title,
  load,
  deps = [],
  children,
}: {
  /** Document title, e.g. "Manage Themes". */
  title: string;
  load: () => Promise<T>;
  deps?: readonly unknown[];
  children: (data: T, reload: () => void) => React.ReactNode;
}) {
  useDocumentTitle(title);
  const { data, loading, error, reload } = useAsync<T>(load, deps);

  if (loading) {
    return (
      <p className="text-sm text-ink-500 py-10" role="status">
        Loading…
      </p>
    );
  }

  if (error) {
    return (
      <div className="py-10">
        <p className="text-sm text-red-700 mb-3">
          Could not load this page: {error.message}
        </p>
        <button
          type="button"
          onClick={reload}
          className="text-xs font-semibold text-primary-700 hover:text-primary-800"
        >
          Retry
        </button>
      </div>
    );
  }

  // `loading` is false and there is no error, so data has resolved.
  return <>{children(data as T, reload)}</>;
}
