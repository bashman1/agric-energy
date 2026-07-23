"use client";

import AdminDataPage from "@/components/admin/AdminDataPage";
import { getSubscribers, exportSubscribersUrl } from "@/lib/data/newsletter";
import { DownloadIcon } from "@/components/shared/icons";

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-primary-50 text-primary-700 border-primary-200",
  pending: "bg-secondary-50 text-secondary-700 border-secondary-200",
  unsubscribed: "bg-ink-100 text-ink-500 border-ink-200",
};

export default function AdminNewsletterPage() {
  return (
    <AdminDataPage title="Newsletter Subscribers" load={() => getSubscribers()}>
      {(subscribers) => {
      const confirmed = subscribers.filter((s) => s.status === "confirmed").length;

      return (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-display text-2xl font-semibold text-ink-900">Newsletter</h1>
              <p className="text-sm text-ink-500 mt-0.5">
                {subscribers.length} subscribers · {confirmed} confirmed
              </p>
            </div>
            <a
              href={exportSubscribersUrl()}
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors"
            >
              <DownloadIcon className="w-4 h-4" /> Export CSV
            </a>
          </div>

          <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
            <table className="responsive-table min-w-full divide-y divide-ink-100">
              <thead>
                <tr className="bg-ink-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-500 uppercase tracking-wide">Subscribed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-50">
                {subscribers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center text-ink-400 py-10 text-sm">No subscribers yet.</td>
                  </tr>
                ) : (
                  subscribers.map((s) => (
                    <tr key={s.id} className="hover:bg-ink-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-ink-900 max-w-xs truncate">{s.email}</td>
                      <td className="px-4 py-3 text-sm text-ink-600">{s.name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status] ?? STATUS_STYLES.unsubscribed}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-500">{s.subscribedAt?.slice(0, 10) ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-ink-400 mt-4">
            The CSV export contains confirmed, active subscribers only — pending and unsubscribed entries are excluded.
          </p>
        </div>
      );
      }}
    </AdminDataPage>
  );
}
