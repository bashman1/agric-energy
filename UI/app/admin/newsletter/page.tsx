import { getSubscribers, exportSubscribersUrl } from "@/lib/data/newsletter";
import { getAuthToken } from "@/lib/auth/session";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Newsletter Subscribers" };

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
  unsubscribed: "bg-gray-50 text-gray-500 border-gray-200",
};

export default async function AdminNewsletterPage() {
  const token = await getAuthToken();
  const subscribers = await getSubscribers(token);
  const confirmed = subscribers.filter((s) => s.status === "confirmed").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {subscribers.length} subscribers · {confirmed} confirmed
          </p>
        </div>
        <a
          href={exportSubscribersUrl()}
          download
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors"
        >
          ⬇ Export CSV
        </a>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="responsive-table min-w-full divide-y divide-gray-100">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Subscribed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center text-gray-400 py-10 text-sm">No subscribers yet.</td>
              </tr>
            ) : (
              subscribers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-xs truncate">{s.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{s.name || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${STATUS_STYLES[s.status] ?? STATUS_STYLES.unsubscribed}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{s.subscribedAt?.slice(0, 10) ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        The CSV export contains confirmed, active subscribers only — pending and unsubscribed entries are excluded.
      </p>
    </div>
  );
}
