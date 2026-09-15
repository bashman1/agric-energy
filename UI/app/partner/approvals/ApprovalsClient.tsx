"use client";

// ============================================================
// Organisation sign-off queue, in the partner portal.
//
// The first of two gates. A colleague's submission waits here until the
// organisation's administrator endorses it; only then does it enter the NREP
// review queue, and only NREP publishes it. Endorsing therefore says "we
// stand behind this", not "this is live" — the copy below is careful about
// the difference, because an author who thinks their work is published stops
// chasing the review that is still outstanding.
//
// Scoped to the caller's own organisation by the API, which reads partner_id
// from the session and refuses anyone who is not its administrator. The
// affordances here mirror those limits; they do not create them.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  endorseOrgItem,
  getOrgQueue,
  getOrgSubmission,
  returnOrgItem,
  type OrgQueueItem,
} from "@/lib/data/partner-portal";
import { RecordFields } from "@/components/shared/ReviewPanel";
import { useSession } from "@/lib/auth/useSession";
import Pagination, { usePagination } from "@/components/admin/Pagination";

const key = (i: OrgQueueItem) => `${i.type}/${i.slug}`;

export default function ApprovalsClient() {
  const { canApproveOrgContent } = useSession();
  const [items, setItems] = useState<OrgQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [returning, setReturning] = useState("");
  const [notes, setNotes] = useState("");
  const [open, setOpen] = useState("");
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null);
  const [detailError, setDetailError] = useState("");
  const [loadingDetail, setLoadingDetail] = useState(false);

  const {
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    totalPages,
    totalItems,
    paginatedItems,
  } = usePagination(items, 1, 10);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getOrgQueue());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load the approvals queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!canApproveOrgContent) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <h1 className="text-lg font-bold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-2">
          Your organisation&apos;s administrator and knowledge manager approve its
          submissions.
        </p>
      </div>
    );
  }

  const toggle = async (item: OrgQueueItem) => {
    const id = key(item);
    if (open === id) {
      setOpen("");
      setDetail(null);
      return;
    }

    setOpen(id);
    setDetail(null);
    setDetailError("");
    setLoadingDetail(true);
    try {
      setDetail(await getOrgSubmission(item.type, item.slug));
    } catch (e) {
      setDetailError(
        e instanceof Error ? e.message : "Could not load this submission."
      );
    } finally {
      setLoadingDetail(false);
    }
  };

  const endorse = async (item: OrgQueueItem) => {
    setBusy(key(item));
    setMessage("");
    try {
      await endorseOrgItem(item);
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not approve that submission.");
    } finally {
      setBusy("");
    }
  };

  const sendBack = async (item: OrgQueueItem) => {
    if (!notes.trim()) return;
    setBusy(key(item));
    setMessage("");
    try {
      await returnOrgItem(item, notes.trim());
      setReturning("");
      setNotes("");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not return that submission.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Approvals</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Submissions from your team, waiting for your sign-off. Approving one sends
          it to the NREP review team — it is not published until they approve it too.
        </p>
      </div>

      {message && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 py-8" role="status">Loading…</p>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm text-gray-500">
            Nothing is waiting for your approval.
          </p>
          <Link href="/partner" className="text-xs font-semibold text-primary-700 hover:text-primary-800 mt-2 inline-block">
            Back to the dashboard
          </Link>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {paginatedItems.map((item) => {
              const id = key(item);
              const isBusy = busy === id;

              return (
                <div key={id} className="px-4 py-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                      {item.type}
                    </span>
                    <span className="font-semibold text-gray-800 text-sm">{item.title}</span>
                  </div>

                  {item.summary && (
                    <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{item.summary}</p>
                  )}

                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Submitted by {item.author ?? "a colleague"}
                    {item.submittedAt && ` · ${new Date(item.submittedAt).toLocaleDateString()}`}
                  </p>

                  <button
                    type="button"
                    onClick={() => toggle(item)}
                    aria-expanded={open === id}
                    className="mt-2 text-xs font-semibold text-primary-700 hover:text-primary-800"
                  >
                    {open === id ? "Hide submission" : "View full submission"}
                  </button>

                  {open === id && (
                    <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50/60 p-3">
                      {loadingDetail ? (
                        <p className="text-sm text-gray-400" role="status">Loading…</p>
                      ) : detailError ? (
                        <p className="text-sm text-red-600">{detailError}</p>
                      ) : detail === null ? (
                        <p className="text-sm text-gray-400">Nothing to show.</p>
                      ) : (
                        <RecordFields record={detail} />
                      )}
                    </div>
                  )}

                  {/* An admin never signs off their own work — the API refuses
                      it, so the buttons are not offered in the first place. */}
                  {item.isMine ? (
                    <p className="text-xs text-gray-500 mt-3">
                      This is your own submission, so a colleague who reviews for your
                      organisation has to approve it.
                    </p>
                  ) : returning === id ? (
                    <div className="mt-3">
                      <label htmlFor={`notes-${id}`} className="block text-xs font-semibold text-gray-600 mb-1">
                        What needs changing?
                      </label>
                      <textarea
                        id={`notes-${id}`}
                        rows={3}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="These notes go to the author with the submission."
                        className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => sendBack(item)}
                          disabled={isBusy || !notes.trim()}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          {isBusy ? "Returning…" : "Return to author"}
                        </button>
                        <button
                          type="button"
                          onClick={() => { setReturning(""); setNotes(""); }}
                          className="px-3 py-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={() => endorse(item)}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                      >
                        {isBusy ? "Approving…" : "Approve & send for platform review"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setReturning(id); setNotes(""); }}
                        disabled={isBusy}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Return with notes
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination
                totalItems={totalItems}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
                pageSizeOptions={[10, 25, 50, 100]}
                showPageSize={true}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}