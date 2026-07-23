// ============================================================
// Report → DetailDocument mapping, so administrative reports
// download through the same PDF/Excel renderers as record
// factsheets.
// ============================================================
import type { ReportDocument } from "@/lib/data/reports";
import { DetailBlock, DetailDocument, pushBlock, toText } from "./document";

export function reportToDocument(
  report: ReportDocument,
  origin: string
): DetailDocument {
  const blocks: DetailBlock[] = [];

  pushBlock(blocks, {
    kind: "fields",
    heading: "Summary",
    fields: [
      { label: "Reporting period", value: report.period.label },
      ...report.summary.map((stat) => ({
        label: stat.label,
        value: toText(stat.value),
      })),
    ],
  });

  for (const section of report.sections) {
    pushBlock(blocks, {
      kind: "table",
      heading: section.heading,
      columns: section.columns,
      rows: section.rows.map((row) => row.map(toText)),
      note:
        section.rows.length === 0
          ? section.note ?? "No records in this reporting period."
          : section.note,
    });
  }

  return {
    entity: "Report",
    title: report.title,
    subtitle: report.description,
    tags: [report.period.label],
    slug: `${report.key}-${report.period.from}-to-${report.period.to}`,
    sourceUrl: `${origin}/admin/reports?report=${report.key}&from=${report.period.from}&to=${report.period.to}`,
    blocks,
  };
}
