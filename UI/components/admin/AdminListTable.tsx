"use client";

// ============================================================
// AdminListTable — the table chrome shared by every admin list.
//
// Pulls together the three things every one of them needs and none of
// them had: pagination, row selection, and bulk delete/publish/unpublish.
// Each page still owns its own columns and row markup — the shapes differ
// too much to generalise, and trying to would produce a column-definition
// DSL nobody enjoys reading. What it does own is everything that has to
// behave identically: the card wrapper, the header row, the empty state,
// the checkbox column, the action bar, and the footer.
//
// Selection is by SLUG, because that is what the bulk API addresses and
// what survives a reload. It is also pruned against the rows currently on
// screen, so a row that a filter or a refresh removed cannot still be
// sitting in the selection waiting to be deleted.
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import Pagination, { usePagination } from "@/components/admin/Pagination";
import { useSession } from "@/lib/auth/useSession";
import {
  bulkAction,
  type BulkAction,
  type BulkContentType,
  type BulkResult,
} from "@/lib/data/bulk";

export interface AdminListColumn {
  label: string;
  /** Extra classes for the <th>, e.g. a width or right alignment. */
  className?: string;
}

interface Props<T> {
  rows: T[];
  columns: AdminListColumn[];
  /** React key for the row. */
  getKey: (row: T) => string | number;
  renderRow: (row: T) => React.ReactNode;
  emptyMessage: string;
  /**
   * Content type for the bulk endpoint. Omit to get pagination only — used
   * by the lists that are not publishable content (users, submissions).
   */
  type?: BulkContentType;
  /** Required when `type` is set: the record's API slug. */
  getSlug?: (row: T) => string;
  /** Required when `type` is set: used to word the confirmation. */
  getLabel?: (row: T) => string;
  /** Re-fetch after a bulk action changes something. */
  onChanged?: () => void;
  initialPageSize?: number;
}

const ACTION_LABEL: Record<BulkAction, string> = {
  delete: "Delete",
  publish: "Publish",
  unpublish: "Unpublish",
};

export default function AdminListTable<T>({
  rows,
  columns,
  getKey,
  renderRow,
  emptyMessage,
  type,
  getSlug,
  getLabel,
  onChanged,
  initialPageSize = 10,
}: Props<T>) {
  const { canManageContent } = useSession();
  const selectable = !!type && !!getSlug;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<BulkAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, totalItems, paginatedItems } =
    usePagination(rows, 1, initialPageSize);

  // Slugs currently reachable. Anything selected but no longer listed —
  // filtered out, or deleted by the last action — drops out of the
  // selection rather than being acted on invisibly.
  const visibleSlugs = useMemo(
    () => (selectable ? rows.map((r) => getSlug!(r)) : []),
    [rows, selectable, getSlug]
  );

  const activeSelection = useMemo(() => {
    if (!selectable) return [] as string[];
    const live = new Set(visibleSlugs);
    return [...selected].filter((slug) => live.has(slug));
  }, [selected, visibleSlugs, selectable]);

  const pageSlugs = useMemo(
    () => (selectable ? paginatedItems.map((r) => getSlug!(r)) : []),
    [paginatedItems, selectable, getSlug]
  );

  const selectedOnPage = pageSlugs.filter((slug) => selected.has(slug)).length;
  const allPageSelected = pageSlugs.length > 0 && selectedOnPage === pageSlugs.length;

  const headerBox = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerBox.current) {
      headerBox.current.indeterminate = selectedOnPage > 0 && !allPageSelected;
    }
  }, [selectedOnPage, allPageSelected]);

  const toggleRow = (slug: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(slug)) next.add(slug);
      return next;
    });

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageSlugs.forEach((slug) => next.delete(slug));
      } else {
        pageSlugs.forEach((slug) => next.add(slug));
      }
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const start = (action: BulkAction) => {
    setResult(null);
    setError(null);
    setPending(action);
  };

  const run = async () => {
    if (!pending || !type || activeSelection.length === 0) return;
    setBusy(true);
    setError(null);
    try {
      const outcome = await bulkAction(type, pending, activeSelection);
      setResult(outcome);
      setPending(null);
      // Only the records that actually changed leave the selection, so a
      // refused one stays ticked next to the reason it was refused.
      setSelected(new Set(outcome.failed.map((f) => f.slug)));
      if (outcome.succeeded.length > 0) onChanged?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "The action could not be completed.");
    } finally {
      setBusy(false);
    }
  };

  const count = activeSelection.length;
  const colSpan = columns.length + (selectable ? 1 : 0);

  // Wording the confirmation with the record's own name beats "3 items"
  // when the selection is small enough to name.
  const confirmSubject = () => {
    if (count === 1 && getLabel) {
      const row = rows.find((r) => getSlug!(r) === activeSelection[0]);
      if (row) return `“${getLabel(row)}”`;
    }
    return `${count} ${count === 1 ? "record" : "records"}`;
  };

  return (
    <div>
      {selectable && count > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2">
          <span className="text-sm font-semibold text-primary-800 tabular-nums" role="status">
            {count} selected
          </span>

          {pending === null ? (
            <>
              {canManageContent && (
                <>
                  <BulkButton onClick={() => start("publish")}>Publish</BulkButton>
                  <BulkButton onClick={() => start("unpublish")}>Unpublish</BulkButton>
                </>
              )}
              <BulkButton onClick={() => start("delete")} tone="danger">
                Delete
              </BulkButton>
              <button
                type="button"
                onClick={clearSelection}
                className="ml-auto text-xs font-semibold text-ink-500 hover:text-ink-700"
              >
                Clear selection
              </button>
            </>
          ) : (
            <>
              <span className="text-sm text-ink-700">
                {pending === "delete"
                  ? `Permanently delete ${confirmSubject()}? This cannot be undone.`
                  : `${ACTION_LABEL[pending]} ${confirmSubject()}?`}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPending(null)}
                  disabled={busy}
                  className="px-3 py-1.5 text-xs font-semibold text-ink-600 hover:text-ink-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={run}
                  disabled={busy}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-60 ${
                    pending === "delete"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-primary-600 hover:bg-primary-700"
                  }`}
                >
                  {busy ? "Working…" : `Yes, ${ACTION_LABEL[pending].toLowerCase()}`}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm" role="alert">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`mb-4 rounded-lg px-3 py-2 text-sm border ${
            result.failed.length === 0
              ? "bg-primary-50 border-primary-200 text-primary-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
          role="status"
        >
          <p className="font-medium">
            {result.succeeded.length} {result.succeeded.length === 1 ? "record" : "records"}{" "}
            {result.action === "delete" ? "deleted" : `${result.action}ed`}
            {result.failed.length > 0 && `, ${result.failed.length} skipped`}.
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs">
              {result.failed.map((f) => (
                <li key={f.slug}>
                  <span className="font-mono">{f.slug}</span> — {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="responsive-table min-w-full divide-y divide-ink-100">
            <thead>
              <tr className="bg-ink-50">
                {selectable && (
                  <th className="w-10 px-4 py-3">
                    <input
                      ref={headerBox}
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={togglePage}
                      disabled={pageSlugs.length === 0}
                      aria-label={allPageSelected ? "Deselect all rows on this page" : "Select all rows on this page"}
                      className="w-4 h-4 rounded accent-primary-700 align-middle"
                    />
                  </th>
                )}
                {columns.map((c) => (
                  <th
                    key={c.label}
                    className={
                      c.className ??
                      "text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide"
                    }
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="text-center text-ink-400 py-10 text-sm">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedItems.map((row) => {
                  const slug = selectable ? getSlug!(row) : "";
                  const checked = selectable && selected.has(slug);
                  return (
                    <tr
                      key={getKey(row)}
                      // The tint goes on the cells, and wins over hover:
                      // globals.css paints `.responsive-table tr:hover td`,
                      // which would otherwise erase the selection highlight
                      // under the pointer — on the very rows a delete is
                      // about to act on.
                      className={
                        checked
                          ? "[&>td]:!bg-primary-50 transition-colors"
                          : "hover:bg-ink-50 transition-colors"
                      }
                    >
                      {selectable && (
                        <td className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRow(slug)}
                            aria-label={getLabel ? `Select ${getLabel(row)}` : `Select ${slug}`}
                            className="w-4 h-4 rounded accent-primary-700 align-middle"
                          />
                        </td>
                      )}
                      {renderRow(row)}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalItems > 0 && (
        <Pagination
          className="mt-4"
          totalItems={totalItems}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}

function BulkButton({
  onClick,
  children,
  tone = "default",
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold bg-white transition-colors ${
        tone === "danger"
          ? "border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
          : "border-ink-200 text-ink-700 hover:bg-ink-50 hover:border-ink-300"
      }`}
    >
      {children}
    </button>
  );
}
