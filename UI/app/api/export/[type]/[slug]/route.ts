// GET /api/export/[type]/[slug]?format=pdf|xlsx
// Renders a published record's detail page as a downloadable
// factsheet (PDF) or workbook (Excel). Public — unpublished
// records 404 the same way their detail pages do.
import { NextRequest, NextResponse } from "next/server";
import { buildDetailDocument, isExportableType } from "@/lib/export/builders";
import { exportFilename } from "@/lib/export/document";
import { renderDetailPdf } from "@/lib/export/pdf";
import { renderDetailXlsx } from "@/lib/export/xlsx";

export const dynamic = "force-dynamic";

const FORMATS = {
  pdf: {
    ext: "pdf",
    contentType: "application/pdf",
  },
  xlsx: {
    ext: "xlsx",
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
} as const;

type Params = { params: Promise<{ type: string; slug: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const { type, slug } = await params;

  if (!isExportableType(type)) {
    return NextResponse.json({ error: "Unknown record type" }, { status: 404 });
  }

  const requested = req.nextUrl.searchParams.get("format") ?? "pdf";
  const format = FORMATS[requested as keyof typeof FORMATS];
  if (!format) {
    return NextResponse.json(
      { error: "Unsupported format — use pdf or xlsx" },
      { status: 400 }
    );
  }

  try {
    const origin = req.nextUrl.origin;
    const doc = await buildDetailDocument(type, slug, origin);
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const generatedAt = new Date();
    const body =
      requested === "pdf"
        ? renderDetailPdf(doc, generatedAt)
        : await renderDetailXlsx(doc, generatedAt);

    return new NextResponse(body as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": format.contentType,
        "Content-Disposition": `attachment; filename="${exportFilename(doc, format.ext)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error(`Export failed for ${type}/${slug}:`, err);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
