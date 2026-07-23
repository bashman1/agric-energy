"use client";

// ============================================================
// Admin Reports — the ToR reporting module. Pick a report and a
// reporting period, preview it, and download it as PDF or Excel.
// /admin/reports
// ============================================================
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AdminDataPage from "@/components/admin/AdminDataPage";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import {
  getReport,
  getReportCatalog,
  type ReportDocument,
  type ReportSection,
} from "@/lib/data/reports";
import { DownloadIcon, DocumentIcon, ChartIcon } from "@/components/shared/icons";
import { useState } from "react";
import { downloadDocument, type DownloadFormat } from "@/lib/export/download";
import { reportToDocument } from "@/lib/export/reports";

/** "22 July 2026, 14:05" for the generated-at stamp. */
function fmtStamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function Panel({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
      <h2 className="font-bold text-ink-900 text-sm mb-4">{title}</h2>
      {children}
      {note && <p className="text-xs text-ink-500 mt-3 italic">{note}</p>}
    </section>
  );
}

/** Two-column numeric sections read better as bars than as a table. */
function BarChart({ rows }: { rows: (string | number)[][] }) {
  const entries = rows.map((row) => [String(row[0]), Number(row[1]) || 0] as const);
  const max = Math.max(1, ...entries.map(([, value]) => value));

  return (
    <div className="space-y-2">
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-center gap-3">
          <div className="w-44 shrink-0 text-xs text-ink-600 truncate text-right">
            {label}
          </div>
          <div className="flex-1 bg-ink-100 rounded-full h-5 overflow-hidden">
            <div
              className="bg-accent-500 h-full rounded-full flex items-center justify-end pr-2"
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

function DataTable({ section }: { section: ReportSection }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-ink-200">
            {section.columns.map((column, i) => (
              <th
                key={column}
                scope="col"
                className={`px-2 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500 ${
                  i === 0 ? "text-left" : "text-right"
                }`}
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {section.rows.map((row, r) => (
            <tr key={r} className="border-b border-ink-100 last:border-0">
              {row.map((cell, c) => (
                <td
                  key={c}
                  className={`px-2 py-1.5 text-ink-800 ${
                    c === 0 ? "text-left" : "text-right tabular-nums"
                  }`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionView({ section }: { section: ReportSection }) {
  if (section.rows.length === 0) {
    return (
      <Panel title={section.heading}>
        <p className="text-sm text-ink-400">
          {section.note ?? "No records in this reporting period."}
        </p>
      </Panel>
    );
  }

  const asChart = section.chart && section.columns.length === 2;
  return (
    <Panel title={section.heading} note={section.note}>
      {asChart ? <BarChart rows={section.rows} /> : <DataTable section={section} />}
    </Panel>
  );
}

function ReportView({ report }: { report: ReportDocument }) {
  const [downloading, setDownloading] = useState<DownloadFormat | null>(null);

  // Rendered in the browser: there is no server to build the file on.
  const download = async (format: DownloadFormat) => {
    setDownloading(format);
    try {
      await downloadDocument(
        reportToDocument(report, window.location.origin),
        format,
        new Date(report.generatedAt)
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink-900">
              {report.title}
            </h2>
            <p className="text-sm text-ink-500 mt-1 max-w-2xl">{report.description}</p>
            <p className="text-xs text-ink-400 mt-2">
              Period {report.period.label} · generated {fmtStamp(report.generatedAt)}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={() => download("pdf")}
              disabled={downloading !== null}
              className="btn btn-secondary disabled:opacity-60"
            >
              <DocumentIcon /> {downloading === "pdf" ? "Preparing…" : "PDF"}
            </button>
            <button
              type="button"
              onClick={() => download("xlsx")}
              disabled={downloading !== null}
              className="btn btn-secondary disabled:opacity-60"
            >
              <ChartIcon /> {downloading === "xlsx" ? "Preparing…" : "Excel"}
            </button>
          </div>
        </div>

        <dl className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
          {report.summary.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-ink-200 bg-ink-50 px-4 py-3"
            >
              <dd className="text-2xl font-bold text-ink-900 tabular-nums">
                {stat.value}
              </dd>
              <dt className="text-xs text-ink-600 mt-0.5">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>

      {report.sections.map((section) => (
        <SectionView key={section.heading} section={section} />
      ))}
    </div>
  );
}

function Reports() {
  const search = useSearchParams();
  const params = {
    report: search.get("report") ?? undefined,
    from: search.get("from") ?? undefined,
    to: search.get("to") ?? undefined,
  };

  return (
    <AdminDataPage
      title="Reports"
      load={async () => {
        const catalog = await getReportCatalog();
        // Only request a report the catalogue actually offers — an
        // arbitrary ?report= would otherwise hit the API as a 404.
        const selectedKey =
          params.report && catalog.some((r) => r.key === params.report)
            ? params.report
            : undefined;
        const report = selectedKey
          ? await getReport(selectedKey, { from: params.from, to: params.to })
          : null;
        return { catalog, selectedKey, report };
      }}
      deps={[params.report, params.from, params.to]}
    >
      {({ catalog, selectedKey, report }) => {
        return (
        <div className="max-w-5xl">
          <AdminPageHeader
            title="Reports"
            subtitle="Generate administrative reports on platform performance, engagement and content, and download them as PDF or Excel."
          />

          {/* Report + period picker — a plain GET form, so every report view
              has a shareable, bookmarkable URL. */}
          <form
            method="get"
            className="bg-white rounded-xl border border-ink-200 shadow-card p-4 mb-6 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
          >
            <label className="block">
              <span className="block text-xs font-semibold text-ink-600 mb-1">Report</span>
              <select
                name="report"
                defaultValue={selectedKey ?? ""}
                className="w-full rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800 bg-white"
              >
                <option value="">Select a report…</option>
                {catalog.map((entry) => (
                  <option key={entry.key} value={entry.key}>
                    {entry.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-ink-600 mb-1">From</span>
              <input
                type="date"
                name="from"
                defaultValue={params.from ?? report?.period.from ?? ""}
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-ink-600 mb-1">To</span>
              <input
                type="date"
                name="to"
                defaultValue={params.to ?? report?.period.to ?? ""}
                className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-800"
              />
            </label>
            <button type="submit" className="btn btn-primary">
              <DownloadIcon /> Generate
            </button>
          </form>

          {report ? (
            <ReportView report={report} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {catalog.map((entry) => (
                <Link
                  key={entry.key}
                  href={`/admin/reports?report=${entry.key}`}
                  className="block bg-white rounded-xl border border-ink-200 shadow-card p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="font-semibold text-ink-900 text-sm">{entry.title}</div>
                  <p className="text-xs text-ink-500 mt-1 leading-relaxed">
                    {entry.description}
                  </p>
                </Link>
              ))}
              {catalog.length === 0 && (
                <p className="text-sm text-ink-500">
                  No reports available — check that your account has reporting access.
                </p>
              )}
            </div>
          )}
        </div>
        );
      }}
    </AdminDataPage>
  );
}

// useSearchParams needs a Suspense boundary to prerender.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Reports />
    </Suspense>
  );
}
