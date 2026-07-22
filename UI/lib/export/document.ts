// ============================================================
// Detail Document — a renderer-agnostic description of a single
// record's detail page. Builders (builders.ts) turn API models
// into this shape; the PDF and Excel renderers consume it.
// ============================================================

export type DetailBlock =
  /** Label/value pairs — the sidebar "Details" panel of a page. */
  | { kind: "fields"; heading: string; fields: DetailField[] }
  /** A prose section (description, outcomes, why-it-matters). */
  | { kind: "text"; heading: string; body: string }
  /** A bulleted list (applications, benefits, beneficiaries). */
  | { kind: "list"; heading: string; items: string[] }
  /** Related records — rendered as a table in both formats. */
  | { kind: "table"; heading: string; columns: string[]; rows: string[][] };

export interface DetailField {
  label: string;
  value: string;
}

export interface DetailDocument {
  /** Human label for the record type, e.g. "Project". */
  entity: string;
  title: string;
  subtitle?: string;
  /** Short descriptors rendered under the title, e.g. status / category. */
  tags?: string[];
  /** Used for the download filename. */
  slug: string;
  /** Public URL of the page this document mirrors. */
  sourceUrl: string;
  blocks: DetailBlock[];
}

// ─── Small helpers shared by the builders ───────────────────

/** Drop empty strings/arrays so blank fields never reach the export. */
export function fields(
  entries: [label: string, value: unknown][]
): DetailField[] {
  return entries
    .map(([label, value]) => ({ label, value: toText(value) }))
    .filter((f) => f.value !== "");
}

export function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.filter(Boolean).join(", ");
  return String(value).trim();
}

/** Push a block only when it carries content. */
export function pushBlock(blocks: DetailBlock[], block: DetailBlock | null) {
  if (!block) return;
  if (block.kind === "fields" && block.fields.length === 0) return;
  if (block.kind === "text" && !block.body.trim()) return;
  if (block.kind === "list" && block.items.filter(Boolean).length === 0) return;
  if (block.kind === "table" && block.rows.length === 0) return;
  blocks.push(block);
}

export function textBlock(heading: string, body: unknown): DetailBlock {
  return { kind: "text", heading, body: toText(body) };
}

export function listBlock(heading: string, items: unknown): DetailBlock {
  return {
    kind: "list",
    heading,
    items: (Array.isArray(items) ? items : []).map(toText).filter(Boolean),
  };
}

/** "USD 285,000" — plain grouped number when no currency is set. */
export function fmtMoney(value?: number | null, currency?: string): string {
  if (value === null || value === undefined) return "";
  const amount = new Intl.NumberFormat("en-GB", {
    maximumFractionDigits: 0,
  }).format(value);
  return currency ? `${currency} ${amount}` : amount;
}

export function fmtNumber(value?: number | null): string {
  if (value === null || value === undefined) return "";
  return new Intl.NumberFormat("en-GB").format(value);
}

/** "12 March 2026" — tolerant of empty/invalid input. */
export function fmtDate(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/** File-system-safe stem for the download, e.g. "project-solar-irrigation". */
export function exportFilename(doc: DetailDocument, ext: string): string {
  const stem = `${doc.entity}-${doc.slug}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${stem}.${ext}`;
}
