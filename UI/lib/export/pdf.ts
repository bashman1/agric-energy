// ============================================================
// PDF renderer — turns a DetailDocument into a print-ready A4
// factsheet. Server-side only (jsPDF runs headless in Node).
// ============================================================
import { jsPDF } from "jspdf";
import { DetailDocument } from "./document";

// Design-system colours, as RGB triples for jsPDF.
const INK_900: [number, number, number] = [26, 24, 21];
const INK_700: [number, number, number] = [69, 65, 58];
const INK_500: [number, number, number] = [124, 118, 106];
const INK_200: [number, number, number] = [229, 227, 220];
const INK_50: [number, number, number] = [248, 248, 246];
const PRIMARY_800: [number, number, number] = [22, 101, 52];
const PRIMARY_100: [number, number, number] = [220, 252, 231];

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CONTENT_W = PAGE_W - MARGIN * 2;
const BOTTOM_LIMIT = PAGE_H - 22;

export function renderDetailPdf(doc: DetailDocument, generatedAt: Date): ArrayBuffer {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const masthead = drawMasthead(pdf, doc);
  let y = masthead.y;

  for (const block of doc.blocks) {
    // The lede already carried the summary in full — don't repeat it.
    if (!masthead.subtitleTruncated && isSubtitleEcho(block, doc)) continue;

    y = drawHeading(pdf, block.heading, y);

    if (block.kind === "fields") {
      y = drawFields(pdf, block.fields, y);
    } else if (block.kind === "text") {
      y = drawParagraph(pdf, block.body, y);
    } else if (block.kind === "list") {
      y = drawList(pdf, block.items, y);
    } else {
      y = drawTable(pdf, block.columns, block.rows, y);
    }
    y += 4;
  }

  drawFooters(pdf, doc, generatedAt);
  return pdf.output("arraybuffer") as ArrayBuffer;
}

// ─── Page furniture ─────────────────────────────────────────

/** Green masthead band with the entity label, title and summary. */
function drawMasthead(
  pdf: jsPDF,
  doc: DetailDocument
): { y: number; subtitleTruncated: boolean } {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(19);
  const titleLines = pdf.splitTextToSize(doc.title, CONTENT_W) as string[];

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  // The lede is capped; the full summary still appears as its own block.
  const allSubtitleLines = doc.subtitle
    ? (pdf.splitTextToSize(doc.subtitle, CONTENT_W) as string[])
    : [];
  const subtitleLines = allSubtitleLines.slice(0, 4);
  const subtitleTruncated = allSubtitleLines.length > subtitleLines.length;
  if (subtitleTruncated) {
    subtitleLines[subtitleLines.length - 1] += " …";
  }

  const bandH =
    20 + titleLines.length * 8 + (subtitleLines.length ? subtitleLines.length * 5 + 3 : 0) +
    (doc.tags?.length ? 9 : 0);

  pdf.setFillColor(...PRIMARY_800);
  pdf.rect(0, 0, PAGE_W, bandH, "F");

  let y = 16;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...PRIMARY_100);
  pdf.text(doc.entity.toUpperCase(), MARGIN, y);

  y += 9;
  pdf.setFontSize(19);
  pdf.setTextColor(255, 255, 255);
  for (const line of titleLines) {
    pdf.text(line, MARGIN, y);
    y += 8;
  }

  if (subtitleLines.length) {
    y += 1;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(...PRIMARY_100);
    for (const line of subtitleLines) {
      pdf.text(line, MARGIN, y);
      y += 5;
    }
  }

  if (doc.tags?.length) {
    y += 3;
    drawTags(pdf, doc.tags, y);
    y += 6;
  }

  return { y: bandH + 12, subtitleTruncated };
}

/** True when a block just restates the masthead summary. */
function isSubtitleEcho(block: DetailBlockLike, doc: DetailDocument): boolean {
  return (
    block.kind === "text" &&
    Boolean(doc.subtitle) &&
    block.body.trim() === doc.subtitle?.trim()
  );
}

type DetailBlockLike = DetailDocument["blocks"][number];

function drawTags(pdf: jsPDF, tags: string[], y: number) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7.5);
  let x = MARGIN;
  for (const tag of tags) {
    const w = pdf.getTextWidth(tag) + 6;
    if (x + w > PAGE_W - MARGIN) break;
    pdf.setDrawColor(...PRIMARY_100);
    pdf.setFillColor(255, 255, 255);
    pdf.roundedRect(x, y - 3.5, w, 5.5, 2.5, 2.5, "S");
    pdf.setTextColor(...PRIMARY_100);
    pdf.text(tag, x + 3, y);
    x += w + 3;
  }
}

/** Source, timestamp and page numbers on every page. */
function drawFooters(pdf: jsPDF, doc: DetailDocument, generatedAt: Date) {
  const total = pdf.getNumberOfPages();
  const stamp = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(generatedAt);

  for (let page = 1; page <= total; page++) {
    pdf.setPage(page);
    pdf.setDrawColor(...INK_200);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN, PAGE_H - 16, PAGE_W - MARGIN, PAGE_H - 16);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7.5);
    pdf.setTextColor(...INK_500);
    pdf.text(doc.sourceUrl, MARGIN, PAGE_H - 11.5);
    pdf.text(`Generated ${stamp} UTC`, MARGIN, PAGE_H - 7.5);
    pdf.text(`Page ${page} of ${total}`, PAGE_W - MARGIN, PAGE_H - 7.5, {
      align: "right",
    });
  }
}

// ─── Flow helpers ───────────────────────────────────────────

/** Start a new page when `needed` mm won't fit; returns the working y. */
function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed <= BOTTOM_LIMIT) return y;
  pdf.addPage();
  return MARGIN + 4;
}

function drawHeading(pdf: jsPDF, heading: string, y: number): number {
  y = ensureSpace(pdf, y, 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11.5);
  pdf.setTextColor(...INK_900);
  pdf.text(heading, MARGIN, y);
  pdf.setDrawColor(...PRIMARY_800);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN, y + 2, MARGIN + 14, y + 2);
  return y + 8;
}

function drawFields(pdf: jsPDF, entries: { label: string; value: string }[], y: number): number {
  const labelW = 52;
  const valueW = CONTENT_W - labelW - 4;

  for (const entry of entries) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const valueLines = pdf.splitTextToSize(entry.value, valueW) as string[];
    const rowH = Math.max(valueLines.length * 4.6, 5) + 2.6;

    y = ensureSpace(pdf, y, rowH);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...INK_500);
    pdf.text(entry.label, MARGIN, y);

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(...INK_900);
    let lineY = y;
    for (const line of valueLines) {
      pdf.text(line, MARGIN + labelW, lineY);
      lineY += 4.6;
    }

    y += rowH;
    pdf.setDrawColor(...INK_200);
    pdf.setLineWidth(0.15);
    pdf.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);
  }

  return y + 1;
}

function drawParagraph(pdf: jsPDF, body: string, y: number): number {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(...INK_700);

  for (const para of body.split(/\n{2,}/)) {
    const lines = pdf.splitTextToSize(para.replace(/\n/g, " ").trim(), CONTENT_W) as string[];
    for (const line of lines) {
      y = ensureSpace(pdf, y, 5);
      pdf.text(line, MARGIN, y);
      y += 4.9;
    }
    y += 2.5;
  }

  return y;
}

function drawList(pdf: jsPDF, items: string[], y: number): number {
  pdf.setFontSize(9.5);

  for (const item of items) {
    pdf.setFont("helvetica", "normal");
    const lines = pdf.splitTextToSize(item, CONTENT_W - 6) as string[];
    y = ensureSpace(pdf, y, lines.length * 4.9 + 2);

    pdf.setTextColor(...PRIMARY_800);
    pdf.text("•", MARGIN, y);
    pdf.setTextColor(...INK_700);
    for (const line of lines) {
      pdf.text(line, MARGIN + 5, y);
      y += 4.9;
    }
    y += 1.4;
  }

  return y + 1;
}

function drawTable(pdf: jsPDF, columns: string[], rows: string[][], y: number): number {
  // First column carries the name, so give it the larger share.
  const weights = columns.map((_, i) => (i === 0 ? 2 : 1));
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => (CONTENT_W * w) / totalWeight);
  const xs = widths.map((_, i) => MARGIN + widths.slice(0, i).reduce((a, b) => a + b, 0));

  const drawHeaderRow = (top: number): number => {
    pdf.setFillColor(...INK_50);
    pdf.rect(MARGIN, top - 4.4, CONTENT_W, 7, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(...INK_500);
    columns.forEach((col, i) => pdf.text(col, xs[i] + 2, top));
    return top + 5.4;
  };

  y = ensureSpace(pdf, y, 20);
  y = drawHeaderRow(y);

  for (const row of rows) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    const cells = row.map((cell, i) => pdf.splitTextToSize(cell ?? "", widths[i] - 4) as string[]);
    const rowH = Math.max(...cells.map((c) => c.length)) * 4.5 + 2.6;

    if (y + rowH > BOTTOM_LIMIT) {
      pdf.addPage();
      y = drawHeaderRow(MARGIN + 4);
    }

    pdf.setTextColor(...INK_900);
    cells.forEach((lines, i) => {
      let lineY = y;
      for (const line of lines) {
        pdf.text(line, xs[i] + 2, lineY);
        lineY += 4.5;
      }
    });

    y += rowH;
    pdf.setDrawColor(...INK_200);
    pdf.setLineWidth(0.15);
    pdf.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2);
  }

  return y + 1;
}
