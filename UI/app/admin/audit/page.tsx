// ============================================================
// Admin Audit Trail — read-only view of the activity log
// /admin/audit  (super-admin only, enforced by the API too)
// ============================================================
import type { Metadata } from "next";
import { getAuthToken, sessionHasRole } from "@/lib/auth/session";
import { getAuditLog } from "@/lib/data/admin";
import AuditClient from "./AuditClient";

export const metadata: Metadata = { title: "Audit Trail" };

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function AdminAuditPage({ searchParams }: PageProps) {
  // The API gates /audit behind `manage-users`, but apiGet swallows the 403
  // into an empty list — which would read as "no activity". Check explicitly
  // so non-super-admins get told why the page is empty.
  const isSuperAdmin = await sessionHasRole("super-admin");
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

  const params = await searchParams;
  const token = await getAuthToken();
  const entries = await getAuditLog(token, {
    event: params.event,
    subjectType: params.subjectType,
    limit: Number(params.limit) || 100,
  });

  return (
    <AuditClient
      entries={entries}
      event={params.event ?? ""}
      subjectType={params.subjectType ?? ""}
      limit={String(Number(params.limit) || 100)}
    />
  );
}
