"use client";
import { useState } from "react";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { CheckCircleIcon } from "@/components/shared/icons";
import type { ReviewQueueItem } from "@/lib/data/admin";
import {
  approveQueueItem,
  rejectQueueItem,
  getAdminRecord,
  getRevision,
} from "@/lib/data/admin";
import { RecordFields, FieldChanges, type FieldChange } from "@/components/shared/ReviewPanel";
import AdminTableFilters, { type SelectFilter } from "@/components/admin/AdminTableFilters";
import Pagination, { usePagination } from "@/components/admin/Pagination";

const TYPE_LABEL: Record<string, string> = {
  projects: "Project",
  technologies: "Technology",
  themes: "Theme",
  partners: "Partner",
  resources: "Resource",
  events: "Event",
  opportunities: "Opportunity",
  policies: "Policy",
  posts: "News",
};

export default function ReviewQueueClient({
  items,
  onChanged,
}: {
  items: ReviewQueueItem[];
  /** Refetch the queue — router.refresh() is inert in a static export. */
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // Which row is expanded for review, and what has been loaded for it. The
  // content is fetched on demand rather than with the queue: a queue of forty
  // items would otherwise pull forty full records nobody has asked to read.
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<
    Record<string, unknown> | { changes: FieldChange[] } | null
  >(null);
  const [detailError, setDetailError] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

  // A live record and a queued edit against it share a type and slug, so the
  // kind has to be part of the key or the two rows collide.
  const key = (i: ReviewQueueItem) =>
    i.kind === "revision" ? `revision/${i.revisionId}` : `${i.type}/${i.slug}`;

  // Derived from the queue, so the dropdowns only offer what is actually
  // waiting — a reviewer clearing partner submissions can narrow to those
  // without reading past everything else.
  const types = [...new Set(items.map((i) => i.type))].sort();
  const authors = [...new Set(items.map((i) => i.author).filter(Boolean))].sort() as string[];

  const filters: SelectFilter<ReviewQueueItem>[] = [
    {
      key: "kind",
      label: "Kind",
      options: [
        { value: "submission", label: "New submissions" },
        { value: "revision", label: "Edits to live content" },
      ],
      match: (i: ReviewQueueItem, v: string) => i.kind === v,
    },
    ...(types.length
      ? [{
          key: "type",
          label: "Content type",
          options: types.map((t) => ({ value: t, label: TYPE_LABEL[t] ?? t })),
          match: (i: ReviewQueueItem, v: string) => i.type === v,
        }]
      : []),
    ...(authors.length
      ? [{
          key: "author",
          label: "Submitted by",
          options: authors.map((a) => ({ value: a, label: a })),
          match: (i: ReviewQueueItem, v: string) => i.author === v,
        }]
      : []),
  ];

  /** Expand a row and load what it is proposing. */
  const toggle = async (i: ReviewQueueItem) => {
    const id = key(i);
    if (open === id) {
      setOpen(null);
      setDetail(null);
      return;
    }

    setOpen(id);
    setDetail(null);
    setDetailError("");
    setLoadingDetail(true);
    try {
      if (i.kind === "revision" && i.revisionId) {
        // A revision's own record still shows the LIVE version, so the queued
        // payload is the only place the proposed values exist.
        const rev = await getRevision(i.revisionId);
        setDetail(rev ? { changes: rev.changes as FieldChange[] } : null);
      } else {
        setDetail(await getAdminRecord(i.type, i.slug));
      }
    } catch (e) {
      setDetailError(
        e instanceof Error ? e.message : "Could not load this submission."
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const approve = async (i: ReviewQueueItem) => {
    setBusy(key(i));
    setError("");
    try {
      await approveQueueItem(i);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setBusy(null);
    }
  };

  const reject = async (i: ReviewQueueItem) => {
    const notes = window.prompt(
      i.kind === "revision"
        ? "Why are these changes being returned? (sent to the author; the published version stays live)"
        : "Reason for rejection (sent to the author):"
    );
    if (!notes) return;
    setBusy(key(i));
    setError("");
    try {
      await rejectQueueItem(i, notes);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <AdminPageHeader
        title="Review Queue"
        subtitle="Submissions awaiting approval, and edits queued against content that is already live."
      />

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-card p-10 text-center">
          <CheckCircleIcon className="block mx-auto mb-3 text-primary-600" style={{ fontSize: "2rem" }} />
          <p className="text-ink-700 font-semibold">Nothing pending review</p>
          <p className="text-ink-400 text-sm mt-1">
            Partner submissions and edits to live content will appear here for approval.
          </p>
        </div>
      ) : (
        <AdminTableFilters
          items={items as (ReviewQueueItem & Record<string, unknown>)[]}
          searchFields={["title", "author", "type"]}
          placeholder="Search submissions…"
          filters={filters as SelectFilter<ReviewQueueItem & Record<string, unknown>>[]}
          dateField={{ key: "submittedAt", label: "Submitted" }}
        >
          {(shown) => shown.length === 0 ? (
            <div className="bg-white rounded-xl border border-ink-200 shadow-card p-10 text-center text-sm text-ink-400">
              No submissions match these filters.
            </div>
          ) : (
            <QueueList
              rows={shown}
              rowKey={key}
              open={open}
              detail={detail}
              detailError={detailError}
              loadingDetail={loadingDetail}
              busy={busy}
              toggle={toggle}
              approve={approve}
              reject={reject}
            />
          )}
        </AdminTableFilters>
      )}
    </div>
  );
}

/**
 * The queue rows, split out so `usePagination` has a component to live in —
 * the filtered rows only exist inside AdminTableFilters' render prop, and a
 * hook cannot be called there.
 */
function QueueList({
  rows,
  rowKey,
  open,
  detail,
  detailError,
  loadingDetail,
  busy,
  toggle,
  approve,
  reject,
}: {
  rows: ReviewQueueItem[];
  rowKey: (i: ReviewQueueItem) => string;
  open: string | null;
  detail: Record<string, unknown> | { changes: FieldChange[] } | null;
  detailError: string;
  loadingDetail: boolean;
  busy: string | null;
  toggle: (i: ReviewQueueItem) => void;
  approve: (i: ReviewQueueItem) => void;
  reject: (i: ReviewQueueItem) => void;
}) {
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, totalItems, paginatedItems } =
    usePagination(rows, 1, 10);

  return (
    <div>
      <div className="bg-white rounded-xl border border-ink-200 shadow-card divide-y divide-ink-100">
        {paginatedItems.map((i) => (
          <div key={rowKey(i)} className="px-4 py-3.5">
            <div className="flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-100">
                    {TYPE_LABEL[i.type] ?? i.type}
                  </span>
                  <span className="font-semibold text-ink-800 text-sm truncate">
                    {i.title}
                  </span>
                  {i.kind === "revision" && (
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                      Edit to live content
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-500 mt-0.5">
                  by {i.author ?? "Unknown"} ·{" "}
                  {i.submittedAt
                    ? new Date(i.submittedAt).toLocaleDateString()
                    : "—"}{" "}
                  · <span className="text-secondary-700 font-medium">{i.workflowStatus}</span>
                </p>
                {i.kind === "revision" && (
                  <p className="text-xs text-blue-700 mt-0.5">
                    Changes {(i.changedFields ?? []).join(", ") || "this record"}. The
                    published version stays live until you approve.
                  </p>
                )}
              </div>
              <button
                onClick={() => toggle(i)}
                aria-expanded={open === rowKey(i)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-ink-200 text-ink-600 hover:bg-ink-50"
              >
                {open === rowKey(i) ? "Hide" : "View"}
              </button>
              <button
                onClick={() => reject(i)}
                disabled={busy === rowKey(i)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => approve(i)}
                disabled={busy === rowKey(i)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50"
              >
                {busy === rowKey(i) ? "…" : "Approve"}
              </button>
            </div>

            {open === rowKey(i) && (
              <div className="mt-3 rounded-lg border border-ink-200 bg-ink-50/40 p-4">
                {loadingDetail ? (
                  <p className="text-sm text-ink-400" role="status">Loading…</p>
                ) : detailError ? (
                  <p className="text-sm text-red-600">{detailError}</p>
                ) : detail === null ? (
                  <p className="text-sm text-ink-400">Nothing to show.</p>
                ) : "changes" in detail ? (
                  <>
                    <p className="text-xs text-ink-500 mb-2">
                      What this edit would change. The published version stays
                      live unless you approve it.
                    </p>
                    <FieldChanges changes={(detail as { changes: FieldChange[] }).changes} />
                  </>
                ) : (
                  <>
                    <p className="text-xs text-ink-500 mb-2">
                      The full submission, as it would be published.
                    </p>
                    <RecordFields record={detail as Record<string, unknown>} />
                  </>
                )}

                <div className="mt-3 pt-3 border-t border-ink-200">
                  <Link
                    href={`/admin/${i.type}/edit?slug=${encodeURIComponent(i.slug)}`}
                    className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                  >
                    Open in the editor →
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
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
