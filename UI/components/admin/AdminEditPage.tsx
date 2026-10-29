// ============================================================
// AdminEditPage — the create/edit scaffold for every admin module.
//
// Replaces the ten app/admin/<module>/[slug]/page.tsx routes. A static
// export can only emit pages whose params are known at build time, and a
// record created after the build has no slug to prerender — so the admin
// editor is a single route (/admin/<module>/edit) that reads ?slug= and
// loads client-side. ?slug=new (or an absent slug) means "create".
// ============================================================
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAsync } from "@/lib/hooks/useAsync";

export interface AdminEditPageProps<T> {
  /** Module segment, e.g. "projects" — used for the breadcrumb link. */
  module: string;
  /** Plural label for the breadcrumb, e.g. "Projects". */
  listLabel: string;
  /** Singular label for headings, e.g. "Project". */
  itemLabel: string;
  /** Load the record being edited. Not called when creating. */
  load: (slug: string) => Promise<T | null>;
  /** Title of the loaded record, for the breadcrumb. */
  titleOf: (item: T) => string;
  /** Render the form. `item` is `{}` when creating. */
  children: (args: {
    item: Partial<T>;
    mode: "new" | "edit";
  }) => React.ReactNode;
}

export default function AdminEditPage<T>({
  module,
  listLabel,
  itemLabel,
  load,
  titleOf,
  children,
}: AdminEditPageProps<T>) {
  const params = useSearchParams();
  const slug = params.get("slug") ?? "new";
  const isNew = slug === "new";

  const { data, loading, error } = useAsync<T | null>(
    () => (isNew ? Promise.resolve(null) : load(slug)),
    [slug, isNew]
  );

  const heading = isNew ? `New ${itemLabel}` : `Edit ${itemLabel}`;
  const crumb = isNew
    ? `New ${itemLabel}`
    : data
      ? titleOf(data)
      : `…`;

  // Every content resource carries the author's name on staff reads.
  const createdBy = !isNew && data
    ? ((data as { createdBy?: string | null }).createdBy ?? null)
    : null;

  const body = () => {
    if (isNew) return children({ item: {}, mode: "new" });
    if (loading) {
      return <p className="text-sm text-ink-500">Loading {itemLabel}…</p>;
    }
    if (error) {
      return (
        <p className="text-sm text-red-700">
          Could not load this {itemLabel.toLowerCase()}: {error.message}
        </p>
      );
    }
    if (!data) {
      return (
        <p className="text-sm text-ink-600">
          No {itemLabel.toLowerCase()} found for “{slug}”.{" "}
          <Link href={`/admin/${module}`} className="text-primary-700 underline">
            Back to {listLabel}
          </Link>
        </p>
      );
    }
    return children({ item: data as Partial<T>, mode: "edit" });
  };

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-ink-500 mb-6">
        <Link href={`/admin/${module}`} className="hover:text-primary-700">
          {listLabel}
        </Link>
        <span>/</span>
        <span className="text-ink-800 font-medium truncate max-w-xs">
          {crumb}
        </span>
      </nav>
      <h1 className={`text-2xl font-display font-semibold text-ink-900 ${createdBy ? "mb-1" : "mb-6"}`}>
        {heading}
      </h1>
      {createdBy && (
        <p className="text-sm text-ink-500 mb-6">Created by {createdBy}</p>
      )}
      {body()}
    </div>
  );
}

/**
 * Build the href for the editor. Centralised so the ?slug= convention has
 * exactly one definition — the old /admin/<module>/<slug> paths no longer
 * resolve to anything in the export.
 */
export function editHref(module: string, slug?: string): string {
  return slug && slug !== "new"
    ? `/admin/${module}/edit?slug=${encodeURIComponent(slug)}`
    : `/admin/${module}/edit`;
}
