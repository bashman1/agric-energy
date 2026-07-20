"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { ReviewQueueItem } from "@/lib/data/admin";

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
}: {
  items: ReviewQueueItem[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const key = (i: ReviewQueueItem) => `${i.type}/${i.slug}`;

  const approve = async (i: ReviewQueueItem) => {
    setBusy(key(i));
    setError("");
    try {
      const res = await fetch(`/api/review/${i.type}/${i.slug}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to approve");
    } finally {
      setBusy(null);
    }
  };

  const reject = async (i: ReviewQueueItem) => {
    const notes = window.prompt("Reason for rejection (sent to the author):");
    if (!notes) return;
    setBusy(key(i));
    setError("");
    try {
      const res = await fetch(`/api/review/${i.type}/${i.slug}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reject");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Content submitted by partners awaiting approval before it goes live.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <p className="text-gray-700 font-semibold">Nothing pending review</p>
          <p className="text-gray-400 text-sm mt-1">
            Partner submissions will appear here for approval.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {items.map((i) => (
            <div
              key={key(i)}
              className="flex items-center gap-4 px-4 py-3.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-50 text-primary-700 border border-primary-100">
                    {TYPE_LABEL[i.type] ?? i.type}
                  </span>
                  <span className="font-semibold text-gray-800 text-sm truncate">
                    {i.title}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  by {i.author ?? "Unknown"} ·{" "}
                  {i.submittedAt
                    ? new Date(i.submittedAt).toLocaleDateString()
                    : "—"}{" "}
                  · <span className="text-amber-600 font-medium">{i.workflowStatus}</span>
                </p>
              </div>
              <Link
                href={`/admin/${i.type}/${i.slug}`}
                className="text-xs font-semibold text-gray-500 hover:text-primary-700"
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
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === key(i) ? "…" : "Approve"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
