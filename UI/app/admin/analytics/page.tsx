import type { Metadata } from "next";
import { getAuthToken } from "@/lib/auth/session";
import { getAnalytics, EXPORT_DATASETS } from "@/lib/data/analytics";
import { DownloadIcon } from "@/components/shared/icons";

export const metadata: Metadata = { title: "Analytics & Reports" };

// Single accent hue for all bar charts.
const BAR = "bg-accent-500";

function BarChart({
  data,
  emptyLabel = "No data",
}: {
  data: Record<string, number>;
  emptyLabel?: string;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (entries.length === 0) {
    return <p className="text-sm text-ink-400">{emptyLabel}</p>;
  }
  return (
    <div className="space-y-2">
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-40 shrink-0 text-xs text-ink-600 truncate text-right">
            {label}
          </div>
          <div className="flex-1 bg-ink-100 rounded-full h-5 overflow-hidden">
            <div
              className={`${BAR} h-full rounded-full flex items-center justify-end pr-2`}
              style={{ width: `${Math.max(6, (value / max) * 100)}%` }}
            >
              <span className="text-[10px] font-bold text-white">{value}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
      <h2 className="font-bold text-ink-900 text-sm mb-4">{title}</h2>
      {children}
    </div>
  );
}

export default async function AdminAnalyticsPage() {
  const token = await getAuthToken();
  const a = await getAnalytics(token);

  const stats = [
    { label: "Content items", value: a.totals.contentItems, sub: `${a.totals.published} published`, tone: "border-primary-200 bg-primary-50" },
    { label: "Pending review", value: a.totals.pendingReview, sub: "awaiting approval", tone: "border-amber-200 bg-amber-50" },
    { label: "Registered users", value: a.users.total, sub: `${a.users.pending} pending, ${a.users.partners} partners`, tone: "border-emerald-200 bg-emerald-50" },
    { label: "Enquiries", value: a.totals.submissions, sub: "contact submissions", tone: "border-purple-200 bg-purple-50" },
  ];

  // Content total per type (for a bar chart).
  const contentByType: Record<string, number> = {};
  for (const [type, c] of Object.entries(a.content)) {
    contentByType[type] = c.total;
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-ink-900">Analytics &amp; Reports</h1>
        <p className="text-sm text-ink-500 mt-0.5">
          Platform metrics and downloadable reports for evidence-based monitoring.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.tone}`}>
            <div className="text-2xl font-bold text-ink-900">{s.value}</div>
            <div className="text-sm font-medium text-ink-700">{s.label}</div>
            <div className="text-xs text-ink-500 mt-0.5">{s.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Panel title="Content by type">
          <BarChart data={contentByType} />
        </Panel>
        <Panel title="Workflow status">
          <BarChart data={a.workflow} />
        </Panel>
        <Panel title="Projects by region">
          <BarChart data={a.projectsByRegion} />
        </Panel>
        <Panel title="Projects by status">
          <BarChart data={a.projectsByStatus} />
        </Panel>
        <Panel title="Projects per thematic area">
          <BarChart data={a.contentByTheme} />
        </Panel>
        <Panel title="Contact submissions by status">
          <BarChart data={a.submissions} emptyLabel="No submissions yet" />
        </Panel>
      </div>

      {/* Downloadable reports */}
      <Panel title="Download reports (CSV)">
        <p className="text-xs text-ink-500 mb-3">
          Export the full dataset for any content type as a spreadsheet-ready CSV.
        </p>
        <div className="flex flex-wrap gap-2">
          {EXPORT_DATASETS.map((ds) => (
            <a
              key={ds}
              href={`/api/analytics/export/${ds}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-ink-700 bg-ink-50 border border-ink-200 rounded-lg hover:border-primary-300 hover:text-primary-700 transition-colors"
            >
              <DownloadIcon className="w-3.5 h-3.5" /> {ds.charAt(0).toUpperCase() + ds.slice(1)}
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}
