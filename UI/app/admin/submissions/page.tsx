import { getAllSubmissions } from "@/lib/data/submissions";
import { getAuthToken } from "@/lib/auth/session";
import Link from "next/link";
import type { Metadata } from "next";
import { Submission } from "@/lib/types";
import { InboxIcon } from "@/components/shared/icons";

export const metadata: Metadata = { title: "Submissions Inbox" };

const statusConfig: Record<string, { label: string; classes: string }> = {
  new: { label: "New", classes: "bg-blue-50 text-blue-700 border-blue-200" },
  read: { label: "Read", classes: "bg-ink-50 text-ink-600 border-ink-200" },
  responded: { label: "Responded", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  archived: { label: "Archived", classes: "bg-orange-50 text-orange-600 border-orange-200" },
};

const emailStatusConfig: Record<string, { icon: string; classes: string }> = {
  sent: { icon: "Email Sent", classes: "text-emerald-600" },
  failed: { icon: "Email Failed", classes: "text-red-500" },
  not_sent: { icon: "Not Sent", classes: "text-ink-400" },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-UG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
    timeZone: "Africa/Kampala",
  });
}

export default async function AdminSubmissionsPage() {
  const token = await getAuthToken();
  const submissions = await getAllSubmissions(token);
  const newCount = submissions.filter((s) => s.status === "new").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900 flex items-center gap-3">
            Submissions Inbox
            {newCount > 0 && (
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">
                {newCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {submissions.length} total · {newCount} new
          </p>
        </div>
      </div>

      {submissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-ink-200 shadow-card p-12 text-center">
          <InboxIcon className="block mx-auto mb-3 text-ink-300" style={{ fontSize: "2rem" }} />
          <p className="text-ink-500 text-sm">No submissions yet. They will appear here when visitors submit the contact form.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
          <table className="min-w-full divide-y divide-ink-100">
            <thead>
              <tr className="bg-ink-50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Sender</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Subject</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-50">
              {submissions.map((s: Submission) => {
                const sc = statusConfig[s.status] ?? statusConfig.new;
                const ec = emailStatusConfig[s.emailStatus] ?? emailStatusConfig.not_sent;
                return (
                  <tr key={s.id} className={`hover:bg-ink-50 transition-colors ${s.status === "new" ? "font-medium" : ""}`}>
                    <td className="px-4 py-3">
                      <div className="text-sm text-ink-900">{s.name}</div>
                      <div className="text-xs text-ink-400">{s.email}</div>
                      {s.organisation && <div className="text-xs text-ink-400">{s.organisation}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-ink-600 bg-ink-100 px-2 py-0.5 rounded-full">{s.submissionType}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <div className="text-sm text-ink-800 truncate">{s.subject}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${sc.classes}`}>
                        {sc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${ec.classes}`}>{ec.icon}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400 whitespace-nowrap">
                      {formatDate(s.submittedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/submissions/${s.id}`}
                        className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
