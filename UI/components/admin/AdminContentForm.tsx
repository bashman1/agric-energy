"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FileUpload from "@/components/shared/FileUpload";
import RichTextEditor from "@/components/shared/RichTextEditor";
import { ApiError, apiSend } from "@/lib/api/client";
import {
  CONTENT_SCHEMAS,
  type ContentFieldDef,
  type ContentModule,
} from "@/components/admin/contentSchemas";

interface Props {
  /** Which content module this form edits (drives the field definitions). */
  module: ContentModule;
  /** Existing record when editing; `{}` when creating. */
  item: Record<string, unknown>;
  mode?: "edit" | "new";
}

type FormState = Record<string, unknown>;

/** `<input type="date">` wants YYYY-MM-DD; `datetime-local` wants YYYY-MM-DDTHH:mm. */
function toInputValue(value: unknown, type: ContentFieldDef["type"]): string {
  if (typeof value !== "string" || !value) return "";
  if (type === "date") return value.slice(0, 10);
  if (type === "datetime") return value.replace(" ", "T").slice(0, 16);
  return value;
}

export default function AdminContentForm({ module, item, mode = "edit" }: Props) {
  const router = useRouter();
  const schema = CONTENT_SCHEMAS[module];
  const slug = typeof item.slug === "string" ? item.slug : "";

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    gallery: [],
    featured: false,
    published: false,
    ...item,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const set = (key: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const inputClass = "w-full px-3 py-2 bg-white border border-ink-200 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15";
  const labelClass = "block text-xs font-semibold text-ink-600 mb-1";

  // ── Field renderer ─────────────────────────────────────────────────────────
  const renderField = (field: ContentFieldDef) => {
    // Conditional fields: the job/vacancy boxes only appear once the
    // opportunity type says this posting is one, and some shared fields
    // read differently on a vacancy ("Deadline" → "Application deadline").
    if (field.showWhen) {
      const gate = String(form[field.showWhen.key] ?? "");
      if (!field.showWhen.equals.includes(gate)) return null;
    }
    const label = field.labelWhen
      ? (field.labelWhen.labels[String(form[field.labelWhen.key] ?? "")] ?? field.label)
      : field.label;

    const id = `field-${field.key}`;
    const value = form[field.key];
    const gallery = Array.isArray(form.gallery) ? (form.gallery as string[]) : [];

    // Checkboxes carry their own inline label.
    if (field.type === "checkbox") {
      return (
        <div key={field.key} className="md:col-span-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              id={id}
              type="checkbox"
              checked={!!value}
              onChange={(e) => set(field.key, e.target.checked)}
              className="w-4 h-4 rounded accent-primary-700"
            />
            <span className="text-sm text-ink-700">{label}</span>
          </label>
          {field.help && <p className="text-[11px] text-ink-400 mt-1">{field.help}</p>}
        </div>
      );
    }

    let control: React.ReactNode;

    switch (field.type) {
      case "textarea":
        control = (
          <textarea
            id={id}
            className={inputClass}
            rows={field.rows ?? 4}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => set(field.key, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
          />
        );
        break;

      case "richtext":
        control = (
          <RichTextEditor
            id={id}
            value={typeof value === "string" ? value : ""}
            onChange={(html) => set(field.key, html)}
            placeholder={field.placeholder}
          />
        );
        break;

      case "select":
        control = (
          <select
            id={id}
            className={inputClass}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => set(field.key, e.target.value)}
            required={field.required}
          >
            <option value="">Select…</option>
            {(field.options ?? []).map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        );
        break;

      case "date":
      case "datetime":
        control = (
          <input
            id={id}
            type={field.type === "date" ? "date" : "datetime-local"}
            className={inputClass}
            value={toInputValue(value, field.type)}
            onChange={(e) => set(field.key, e.target.value)}
            required={field.required}
          />
        );
        break;

      case "upload-image":
        control = (
          <div className="flex items-center gap-3">
            <FileUpload kind="image" value={typeof value === "string" ? value : ""} onUploaded={(url) => set(field.key, url)} />
            <input
              id={id}
              type="url"
              className={inputClass}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => set(field.key, e.target.value)}
              placeholder="…or paste an image URL"
            />
          </div>
        );
        break;

      case "upload-document":
        control = (
          <div className="flex items-center gap-3">
            <FileUpload kind="document" value={typeof value === "string" ? value : ""} onUploaded={(url) => set(field.key, url)} />
            <input
              id={id}
              type="url"
              className={inputClass}
              value={typeof value === "string" ? value : ""}
              onChange={(e) => set(field.key, e.target.value)}
              placeholder="…or paste a document URL"
            />
          </div>
        );
        break;

      case "upload-gallery":
        control = (
          <div>
            <FileUpload kind="image" onUploaded={(url) => set("gallery", [...gallery, url])} />
            {gallery.length > 0 && (
              <ul className="flex flex-wrap gap-3 mt-3">
                {gallery.map((url, i) => (
                  <li key={`${url}-${i}`} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Gallery item ${i + 1}`} className="h-16 w-16 object-cover rounded border border-ink-200" />
                    <button
                      type="button"
                      aria-label={`Remove gallery image ${i + 1}`}
                      onClick={() => set("gallery", gallery.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-ink-200 text-ink-500 text-xs leading-none hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
        break;

      case "list": {
        // A string[] edited as one item per line.
        const items = Array.isArray(value) ? (value as string[]) : [];
        control = (
          <textarea
            id={id}
            className={inputClass}
            rows={field.rows ?? 4}
            value={items.join("\n")}
            onChange={(e) =>
              set(
                field.key,
                e.target.value.split("\n").map((s) => s.trim()).filter(Boolean)
              )
            }
            placeholder={field.placeholder}
          />
        );
        break;
      }

      default:
        control = (
          <input
            id={id}
            type={field.type === "url" ? "url" : "text"}
            className={inputClass}
            value={typeof value === "string" ? value : ""}
            onChange={(e) => set(field.key, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
          />
        );
    }

    return (
      <div key={field.key} className={field.half ? "" : "md:col-span-2"}>
        {/* The editor is a div, not a form control, so <label for> would
            point at nothing focusable. */}
        {field.type === "richtext" ? (
          <span className={labelClass}>
            {label}{field.required ? " *" : ""}
          </span>
        ) : (
          <label htmlFor={id} className={labelClass}>
            {label}{field.required ? " *" : ""}
          </label>
        )}
        {control}
        {field.help && <p className="text-[11px] text-ink-400 mt-1">{field.help}</p>}
      </div>
    );
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      const isNew = mode === "new";
      const path = isNew ? schema.apiPath : `${schema.apiPath}/${slug}`;
      const method = isNew ? "POST" : "PUT";
      const saved = await apiSend<{ slug?: string }>(method, path, form);
      setMsg({
        type: "success",
        text: isNew ? `${schema.singular} created successfully!` : `${schema.singular} updated successfully!`,
      });
      // A new record has no page until it is loaded by slug, so send the
      // editor to its own URL rather than refreshing an inert route.
      if (isNew && saved?.slug) {
        router.replace(`${schema.adminPath}/edit?slug=${encodeURIComponent(saved.slug)}`);
      }
    } catch (err) {
      setMsg({ type: "error", text: err instanceof ApiError ? err.message : "Network error. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {msg && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${msg.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-red-50 text-red-700 border border-red-200"
          }`}>
          {msg.type === "success" ? "✓" : "✗"} {msg.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white rounded-xl border border-ink-200 p-5">
            <h2 className="font-bold text-ink-900 text-sm mb-4">{schema.singular} Details</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {schema.fields.map(renderField)}
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-ink-200 p-5">
            <h3 className="font-bold text-ink-900 text-sm mb-4">Status &amp; Visibility</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.published}
                  onChange={(e) => set("published", e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-700"
                />
                <span className="text-sm text-ink-700">Published (visible on public site)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="w-4 h-4 rounded accent-primary-700"
                />
                <span className="text-sm text-ink-700">Featured (highlighted on the site)</span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary-700 text-white text-sm font-bold rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50">
              {saving ? "Saving…" : mode === "new" ? `Create ${schema.singular}` : "Save Changes"}
            </button>
            {mode === "edit" && slug && (
              <Link href={`${schema.publicPath}/${slug}`} target="_blank"
                className="w-full py-2 border border-ink-200 text-ink-600 text-sm font-medium rounded-lg hover:bg-ink-50 transition-colors text-center">
                Preview Public Page →
              </Link>
            )}
            <Link href={schema.adminPath} className="w-full py-2 text-ink-400 hover:text-ink-600 text-sm text-center transition-colors">
              ← Back to {schema.plural}
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
