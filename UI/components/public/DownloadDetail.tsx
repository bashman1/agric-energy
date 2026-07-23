"use client";

// ============================================================
// Download menu for record detail pages — offers the current
// record as a PDF factsheet or an Excel workbook.
//
// Rendered in the BROWSER. This used to link at the
// /api/export/[type]/[slug] route handler, which went away with the Node
// server; jspdf and exceljs both run client-side, and the record data is
// fetched from /api/v1 on the same origin.
// ============================================================
import { useEffect, useRef, useState } from "react";
import { DownloadIcon, DocumentIcon, ChartIcon } from "@/components/shared/icons";
import { buildDetailDocument, isExportableType } from "@/lib/export/builders";
import { downloadDocument, type DownloadFormat } from "@/lib/export/download";

interface Props {
  /** Record type segment, e.g. "projects" — must match EXPORTABLE_TYPES. */
  type: string;
  slug: string;
  /** Used in the accessible label, e.g. "project". */
  label?: string;
  /** `dark` sits on the green masthead; `light` on white surfaces. */
  tone?: "dark" | "light";
  className?: string;
}

export default function DownloadDetail({
  type,
  slug,
  label = "record",
  tone = "dark",
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const [busy, setBusy] = useState<DownloadFormat | null>(null);
  const [error, setError] = useState("");

  const download = async (format: DownloadFormat) => {
    if (!isExportableType(type)) return;
    setBusy(format);
    setError("");
    try {
      const doc = await buildDetailDocument(type, slug, window.location.origin);
      if (!doc) throw new Error("This record could not be loaded.");
      await downloadDocument(doc, format, new Date());
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(null);
    }
  };

  const trigger =
    tone === "dark"
      ? "border border-white/30 text-white hover:bg-white/10"
      : "btn-secondary";

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Download this ${label}`}
        className={`btn ${trigger}`}
      >
        <DownloadIcon className="text-base" />
        Download
        <span aria-hidden className="text-[0.6rem] opacity-70">▼</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 w-60 overflow-hidden rounded-lg border border-ink-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => download("pdf")}
            disabled={busy !== null}
            className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-ink-50 disabled:opacity-60"
          >
            <DocumentIcon className="mt-0.5 text-base text-primary-700" />
            <span>
              <span className="block text-sm font-semibold text-ink-900">
                {busy === "pdf" ? "Preparing…" : "PDF factsheet"}
              </span>
              <span className="block text-xs text-ink-500">Formatted for printing</span>
            </span>
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => download("xlsx")}
            disabled={busy !== null}
            className="flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-ink-50 disabled:opacity-60"
          >
            <ChartIcon className="mt-0.5 text-base text-primary-700" />
            <span>
              <span className="block text-sm font-semibold text-ink-900">
                {busy === "xlsx" ? "Preparing…" : "Excel workbook"}
              </span>
              <span className="block text-xs text-ink-500">.xlsx — data for reuse</span>
            </span>
          </button>
          {error && (
            <p role="alert" className="px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
