// ============================================================
// Admin Audit Trail — read-only view of the activity log
// /admin/audit  (super-admin only, enforced by the API too)
//
// Client-rendered: filters come from the query string and the data is
// fetched in the browser, since the static export has no server on which
// to read searchParams or the session.
// ============================================================
"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminDataPage from "@/components/admin/AdminDataPage";
import { getAuditLog } from "@/lib/data/admin";
import { useSession } from "@/lib/auth/useSession";
import AuditClient from "./AuditClient";

function Audit() {
  const params = useSearchParams();
  const { user, loading } = useSession();

  const event = params.get("event") ?? undefined;
  const subjectType = params.get("subjectType") ?? undefined;
  const limit = Number(params.get("limit")) || 100;

  // The API gates /audit behind `manage-users`, but apiGet swallows the 403
  // into an empty list — which would read as "no activity". Check explicitly
  // so non-super-admins get told why the page is empty.
  const isSuperAdmin = !!user?.roles?.includes("super-admin");

  if (loading) return null;

  if (!isSuperAdmin) {
    return (
      <div className="max-w-2xl">
        <h1 className="text-2xl font-display font-semibold text-ink-900">Audit Trail</h1>
        <div className="mt-5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-4 py-3 text-sm">
          The audit trail is restricted to super-admins. Ask a super-admin if
          you need access to this record.
        </div>
      </div>
    );
  }

  return (
    <AdminDataPage
      title="Audit Trail"
      load={() => getAuditLog(undefined, { event, subjectType, limit })}
      deps={[event, subjectType, limit]}
    >
      {(entries) => (
        <AuditClient
          entries={entries}
          event={event ?? ""}
          subjectType={subjectType ?? ""}
          limit={String(limit)}
        />
      )}
    </AdminDataPage>
  );
}

// useSearchParams needs a Suspense boundary to prerender.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Audit />
    </Suspense>
  );
}
