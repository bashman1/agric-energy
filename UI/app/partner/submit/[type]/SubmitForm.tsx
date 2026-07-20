"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FIELD_SCHEMAS, TYPE_LABELS } from "./schemas";
import FileUpload from "@/components/shared/FileUpload";

export default function SubmitForm({ type }: { type: string }) {
  const router = useRouter();
  const fields = FIELD_SCHEMAS[type] ?? [];
  const label = TYPE_LABELS[type] ?? "Content";
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/partner/submit/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Submission failed");
      router.push("/partner");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/partner" className="hover:text-primary-700">Dashboard</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-800 font-medium">Submit {label}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Submit a {label}</h1>
      <p className="text-sm text-gray-500 mb-6">
        Your submission will be reviewed by an administrator before it is published.
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        {fields.map((f) => (
          <div key={f.key}>
            {f.type === "upload-image" || f.type === "upload-document" ? (
              <FileUpload
                kind={f.type === "upload-document" ? "document" : "image"}
                label={f.label}
                value={(values[f.key] as string) ?? ""}
                onUploaded={(url) =>
                  setValues((v) => ({ ...v, [f.key]: url }))
                }
              />
            ) : f.type === "checkbox" ? (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={!!values[f.key]}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [f.key]: e.target.checked }))
                  }
                  className="rounded border-gray-300"
                />
                {f.label}
              </label>
            ) : (
              <>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                {f.type === "textarea" ? (
                  <textarea
                    rows={3}
                    required={f.required}
                    value={(values[f.key] as string) ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                  />
                ) : (
                  <input
                    type={f.type === "date" ? "text" : "text"}
                    required={f.required}
                    value={(values[f.key] as string) ?? ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [f.key]: e.target.value }))
                    }
                    className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
                  />
                )}
              </>
            )}
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800 disabled:opacity-50"
          >
            {loading ? "Submitting…" : "Submit for review"}
          </button>
          <Link
            href="/partner"
            className="px-5 py-2.5 text-gray-600 font-semibold rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
