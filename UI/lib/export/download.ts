// ============================================================
// Client-side document downloads.
//
// Replaces app/api/admin/reports/[report]/route.ts, which rendered the
// PDF/XLSX on the Node server. jspdf and exceljs both run in the browser,
// and the report JSON already arrives over /api/v1 — so the render moves
// to the client and the route handler disappears with the server.
// ============================================================
"use client";

import type { DetailDocument } from "./document";
import { exportFilename } from "./document";
import { renderDetailPdf } from "./pdf";
import { renderDetailXlsx } from "./xlsx";

export type DownloadFormat = "pdf" | "xlsx";

const CONTENT_TYPES: Record<DownloadFormat, string> = {
  pdf: "application/pdf",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Push a Blob at the browser as a file download. */
function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Render a document and download it. */
export async function downloadDocument(
  doc: DetailDocument,
  format: DownloadFormat,
  generatedAt: Date
): Promise<void> {
  const body =
    format === "pdf"
      ? renderDetailPdf(doc, generatedAt)
      : await renderDetailXlsx(doc, generatedAt);

  saveBlob(
    new Blob([body as ArrayBuffer], { type: CONTENT_TYPES[format] }),
    exportFilename(doc, format)
  );
}
