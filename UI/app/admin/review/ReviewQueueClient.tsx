"use client";
import { useState } from "react";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { CheckCircleIcon } from "@/components/shared/icons";
import type { ReviewQueueItem } from "@/lib/data/admin";
import { approveQueueItem, rejectQueueItem } from "@/lib/data/admin";
import AdminTableFilters, { type SelectFilter } from "@/components/admin/AdminTableFilters";

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
        <div className="bg-white rounded-xl border border-ink-200 shadow-card divide-y divide-ink-100">
          {shown.map((i) => (
            <div
              key={key(i)}
              className="flex items-center gap-4 px-4 py-3.5"
            >
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
              <Link
                href={`/admin/${i.type}/${i.slug}`}
                className="text-xs font-semibold text-ink-500 hover:text-primary-700"
              >
                View
              </Link>
              <button
                onClick={() => reject(i)}
                disabled={busy === key(i)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => approve(i)}
                disabled={busy === key(i)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50"
              >
                {busy === key(i) ? "…" : "Approve"}
              </button>
            </div>
          ))}
        </div>
          )}
        </AdminTableFilters>
      )}
    </div>
  );
}
