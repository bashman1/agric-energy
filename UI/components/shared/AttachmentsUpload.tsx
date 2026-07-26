"use client";
import { useState } from "react";
import { apiUpload } from "@/lib/api/client";
import type { ProjectAttachment } from "@/lib/types";

/**
 * Multi-file attachment widget. Uploads each document to Laravel's
 * /api/v1/media (kind=document) and keeps the full { url, name, size }
 * returned by the API, appending to a list rather than replacing a single
 * value. Unlike FileUpload (single image/URL), this preserves the original
 * filename so it can be shown and downloaded on the public detail page.
 */
const DOC_ACCEPT = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";

/** "1.2 MB" from a byte count. */
function fmtSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentsUpload({
  value = [],
  onChange,
  label,
}: {
  value?: ProjectAttachment[];
  onChange: (attachments: ProjectAttachment[]) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (files: FileList) => {
    setError("");
    setUploading(true);
    try {
      const uploaded: ProjectAttachment[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("kind", "document");
        const media = await apiUpload<{ url: string; name: string; size?: number }>("media", fd);
        if (media?.url) {
          uploaded.push({ url: media.url, name: media.name ?? file.name, size: media.size });
        }
      }
      if (uploaded.length) onChange([...value, ...uploaded]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-ink-600 mb-1">{label}</label>
      )}

      {value.length > 0 && (
        <ul className="mb-3 space-y-2">
          {value.map((att, idx) => (
            <li
              key={`${att.url}-${idx}`}
              className="flex items-center gap-2 px-3 py-2 bg-ink-50 border border-ink-200 rounded-lg text-sm"
            >
              <span className="text-ink-400">📎</span>
              <a
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 min-w-0 truncate text-ink-800 hover:text-primary-700 font-medium"
              >
                {att.name}
              </a>
              {att.size ? <span className="text-xs text-ink-400 shrink-0">{fmtSize(att.size)}</span> : null}
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label={`Remove ${att.name}`}
                className="shrink-0 text-ink-400 hover:text-red-600 transition-colors"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:border-primary-300 hover:text-primary-700 cursor-pointer transition-colors">
        {uploading ? "Uploading…" : "⬆ Add file(s)"}
        <input
          type="file"
          accept={DOC_ACCEPT}
          multiple
          disabled={uploading}
          className="hidden"
          onChange={(e) => {
            const files = e.target.files;
            if (files && files.length) upload(files);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
      </label>
      <p className="text-[11px] text-ink-400 mt-1">
        PDF, Word, Excel, PowerPoint, CSV or text — up to 10 MB each.
      </p>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
