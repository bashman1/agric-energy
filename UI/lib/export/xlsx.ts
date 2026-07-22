// ============================================================
// Excel renderer — turns a DetailDocument into a single-sheet
// .xlsx workbook. Server-side only.
// ============================================================
import ExcelJS from "exceljs";
import { DetailDocument } from "./document";

const COLS = 5; // A..E — label column plus four value columns
const PRIMARY_800 = "FF166534";
const PRIMARY_100 = "FFDCFCE7";
const INK_50 = "FFF8F8F6";
const INK_200 = "FFE5E3DC";
const INK_500 = "FF7C766A";
const INK_900 = "FF1A1815";

export async function renderDetailXlsx(
  doc: DetailDocument,
  generatedAt: Date
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Agri-Energy Desk";
  workbook.created = generatedAt;

  const sheet = workbook.addWorksheet(doc.entity, {
    views: [{ state: "frozen", ySplit: 1 }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true },
  });
  sheet.columns = [
    { width: 30 },
    { width: 34 },
    { width: 24 },
    { width: 20 },
    { width: 20 },
  ];

  writeMasthead(sheet, doc);

  for (const block of doc.blocks) {
    // The masthead prints the summary in full — don't repeat it.
    if (
      block.kind === "text" &&
      doc.subtitle &&
      block.body.trim() === doc.subtitle.trim()
    ) {
      continue;
    }

    writeHeading(sheet, block.heading);

    if (block.kind === "fields") {
      for (const field of block.fields) writeField(sheet, field.label, field.value);
    } else if (block.kind === "text") {
      writeParagraph(sheet, block.body);
    } else if (block.kind === "list") {
      for (const item of block.items) writeBullet(sheet, item);
    } else {
      writeTable(sheet, block.columns, block.rows);
    }

    sheet.addRow([]);
  }

  writeFooter(sheet, doc, generatedAt);

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

// ─── Row writers ────────────────────────────────────────────

type Sheet = ExcelJS.Worksheet;

function mergeAcross(sheet: Sheet, row: ExcelJS.Row) {
  sheet.mergeCells(row.number, 1, row.number, COLS);
}

function writeMasthead(sheet: Sheet, doc: DetailDocument) {
  const kind = sheet.addRow([doc.entity.toUpperCase()]);
  kind.font = { bold: true, size: 9, color: { argb: PRIMARY_100 } };
  kind.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY_800 } };
  kind.height = 18;
  mergeAcross(sheet, kind);
  kind.alignment = { vertical: "middle", indent: 1 };

  const title = sheet.addRow([doc.title]);
  title.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
  title.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY_800 } };
  title.height = 30;
  mergeAcross(sheet, title);
  title.alignment = { vertical: "middle", indent: 1 };

  if (doc.subtitle) {
    const subtitle = sheet.addRow([doc.subtitle]);
    subtitle.font = { size: 10, color: { argb: PRIMARY_100 } };
    subtitle.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY_800 } };
    mergeAcross(sheet, subtitle);
    subtitle.alignment = { vertical: "top", wrapText: true, indent: 1 };
    subtitle.height = Math.min(60, 14 + Math.floor(doc.subtitle.length / 110) * 13);
  }

  if (doc.tags?.length) {
    const tags = sheet.addRow([doc.tags.join("  ·  ")]);
    tags.font = { bold: true, size: 9, color: { argb: PRIMARY_100 } };
    tags.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: PRIMARY_800 } };
    mergeAcross(sheet, tags);
    tags.alignment = { vertical: "middle", indent: 1 };
  }

  sheet.addRow([]);
}

function writeHeading(sheet: Sheet, heading: string) {
  const row = sheet.addRow([heading]);
  row.font = { bold: true, size: 11, color: { argb: INK_900 } };
  row.height = 20;
  mergeAcross(sheet, row);
  row.alignment = { vertical: "middle" };
  row.getCell(1).border = { bottom: { style: "medium", color: { argb: PRIMARY_800 } } };
}

function writeField(sheet: Sheet, label: string, value: string) {
  const row = sheet.addRow([label, value]);
  row.getCell(1).font = { bold: true, size: 9, color: { argb: INK_500 } };
  row.getCell(2).font = { size: 10, color: { argb: INK_900 } };
  row.getCell(2).alignment = { wrapText: true, vertical: "top" };
  sheet.mergeCells(row.number, 2, row.number, COLS);
  for (let c = 1; c <= COLS; c++) {
    row.getCell(c).border = { bottom: { style: "hair", color: { argb: INK_200 } } };
  }
}

function writeParagraph(sheet: Sheet, body: string) {
  for (const para of body.split(/\n{2,}/)) {
    const text = para.replace(/\n/g, " ").trim();
    if (!text) continue;
    const row = sheet.addRow([text]);
    row.font = { size: 10, color: { argb: INK_900 } };
    mergeAcross(sheet, row);
    row.alignment = { wrapText: true, vertical: "top" };
    // ~128 characters fit per line across the merged width.
    row.height = Math.min(240, 15 * Math.max(1, Math.ceil(text.length / 128)));
  }
}

function writeBullet(sheet: Sheet, item: string) {
  const row = sheet.addRow([`•  ${item}`]);
  row.font = { size: 10, color: { argb: INK_900 } };
  mergeAcross(sheet, row);
  row.alignment = { wrapText: true, vertical: "top" };
  row.height = Math.min(240, 15 * Math.max(1, Math.ceil(item.length / 128)));
}

function writeTable(sheet: Sheet, columns: string[], rows: string[][]) {
  const header = sheet.addRow(columns);
  header.font = { bold: true, size: 9, color: { argb: INK_500 } };
  for (let c = 1; c <= columns.length; c++) {
    header.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: INK_50 } };
    header.getCell(c).border = { bottom: { style: "thin", color: { argb: INK_200 } } };
  }

  for (const values of rows) {
    const row = sheet.addRow(values);
    row.font = { size: 10, color: { argb: INK_900 } };
    for (let c = 1; c <= columns.length; c++) {
      row.getCell(c).alignment = { wrapText: true, vertical: "top" };
      row.getCell(c).border = { bottom: { style: "hair", color: { argb: INK_200 } } };
    }
  }
}

function writeFooter(sheet: Sheet, doc: DetailDocument, generatedAt: Date) {
  const stamp = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(generatedAt);

  for (const line of [doc.sourceUrl, `Generated ${stamp} UTC`]) {
    const row = sheet.addRow([line]);
    row.font = { size: 8, color: { argb: INK_500 } };
    mergeAcross(sheet, row);
  }
}
