// ============================================================
// Reports data service — the admin reporting module, backed by
// /api/v1/reports. Each report is a self-describing document:
// period, summary figures and tabular sections.
// ============================================================
import { apiGet } from "@/lib/api/client";

export interface ReportSummaryStat {
  label: string;
  value: number | string;
}

export interface ReportSection {
  heading: string;
  kind: "table";
  columns: string[];
  rows: (string | number)[][];
  /** Render as a bar chart in the admin preview (2 columns, numeric second). */
  chart?: boolean;
  /** Caption explaining scope or cut-offs. */
  note?: string;
}

export interface ReportDocument {
  key: string;
  title: string;
  description: string;
  period: { from: string; to: string; label: string };
  generatedAt: string;
  summary: ReportSummaryStat[];
  sections: ReportSection[];
}

export interface ReportCatalogEntry {
  key: string;
  title: string;
  description: string;
}

export interface ReportRange {
  from?: string;
  to?: string;
}

export async function getReportCatalog(
  token?: string
): Promise<ReportCatalogEntry[]> {
  return apiGet<ReportCatalogEntry[]>("reports", [], { token });
}

export async function getReport(
  key: string,
  range: ReportRange = {},
  token?: string
): Promise<ReportDocument | null> {
  return apiGet<ReportDocument | null>(`reports/${key}`, null, {
    params: { from: range.from, to: range.to },
    token,
  });
}
