"use client";
import { useState } from "react";

/**
 * Reusable upload widget. Uploads to /api/media (which proxies to the Laravel
 * API with the server-side token) and calls onUploaded with the public URL.
 * Drop into any form: <FileUpload kind="image" value={url} onUploaded={setUrl} />
 */
export default function FileUpload({
  kind = "image",
  value,
  onUploaded,
  label,
}: {
  kind?: "image" | "document";
  value?: string;
  onUploaded: (url: string) => void;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const accept =
    kind === "document"
      ? ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
      : "image/*";

  const upload = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", kind);
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      onUploaded(json.data.url as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          {label}
        </label>
      )}
      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:border-primary-300 hover:text-primary-700 cursor-pointer transition-colors">
          {uploading ? "Uploading…" : kind === "document" ? "⬆ Upload file" : "⬆ Upload image"}
          <input
            type="file"
            accept={accept}
            disabled={uploading}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
          />
        </label>
        {value && kind === "image" && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt="preview"
            className="h-10 w-10 object-cover rounded border border-gray-200"
          />
        )}
        {value && kind === "document" && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary-700 font-medium truncate max-w-[12rem]"
          >
            View uploaded file
          </a>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
