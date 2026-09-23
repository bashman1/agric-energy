"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FIELD_SCHEMAS, TYPE_LABELS, type FieldDef } from "./schemas";
import FileUpload from "@/components/shared/FileUpload";
import AttachmentsUpload from "@/components/shared/AttachmentsUpload";
import RichTextEditor from "@/components/shared/RichTextEditor";
import LocationPicker, { type LocationValue } from "@/components/admin/LocationPicker";
import ComboSelect, { type ComboOption } from "@/components/admin/ComboSelect";
import { apiSend } from "@/lib/api/client";
import { fetchDistrictMeta, type DistrictMeta } from "@/lib/geo/ugandaGeo";
import type { ProjectAttachment } from "@/lib/types";

export interface ReferenceData {
  taxonomy: {
    partnerTypes: { id: string; label: string }[];
    technologyCategories: { id: string; label: string }[];
    projectStatuses: { id: string; label: string }[];
    valueChains: { id: string; label: string }[];
  };
  partners: { id: string; label: string; type: string }[];
  technologies: { id: string; label: string }[];
  themes: { id: string; label: string }[];
  regions: string[];
}

interface Props {
  type: string;
  referenceData: ReferenceData;
}

type FormValues = Record<string, string | boolean | string[] | ProjectAttachment[]>;

const EMPTY_LOCATION: LocationValue = {
  regions: [],
  districts: [],
  lat: "",
  lng: "",
  locationNote: "",
  region: "",
  district: "",
};

function resolveOptions(
  field: FieldDef,
  referenceData: ReferenceData,
  selectedRegion: string,
  districts: DistrictMeta[]
): ComboOption[] {
  const from = field.optionsFrom;
  if (!from) return field.options ?? [];

  switch (from) {
    case "taxonomy:partnerTypes":
      return referenceData.taxonomy.partnerTypes;
    case "taxonomy:technologyCategories":
      return referenceData.taxonomy.technologyCategories;
    case "taxonomy:projectStatuses":
      return referenceData.taxonomy.projectStatuses;
    case "taxonomy:valueChains":
      return referenceData.taxonomy.valueChains;
    case "technologies":
      return referenceData.technologies;
    case "themes":
      return referenceData.themes;
    case "regions":
      return referenceData.regions.map((r) => ({ id: r, label: r }));
    case "districts-by-region": {
      if (!selectedRegion) return [];
      const regionLower = selectedRegion.toLowerCase();
      return districts
        .filter((d) => d.region.toLowerCase() === regionLower)
        .map((d) => ({ id: d.name, label: d.name }));
    }
    case "partners": {
      // The type is appended to the label rather than gating the list behind
      // a separate control: it stays visible, it is searchable along with the
      // name, and each field resolves its own options independently.
      return referenceData.partners.map((p) => ({
        id: p.id,
        label: p.type ? `${p.label} — ${p.type}` : p.label,
      }));
    }
    case "technologyStatuses":
      return [
        { id: "new", label: "New" },
        { id: "existing", label: "Existing" },
        { id: "bought", label: "Bought" },
      ];
    default:
      return field.options ?? [];
  }
}

export default function SubmitForm({ type, referenceData }: Props) {
  const router = useRouter();
  const fields = FIELD_SCHEMAS[type] ?? [];
  const label = TYPE_LABELS[type] ?? "Content";

  const [values, setValues] = useState<FormValues>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [districts, setDistricts] = useState<DistrictMeta[]>([]);
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);

  useEffect(() => {
    fetchDistrictMeta().then(setDistricts).catch(() => {});
  }, []);

  const hasLocationField = fields.some((f) => f.type === "location");
  // With a LocationPicker present it owns the region; the plain select is only
  // used by schemas that have not got one (opportunities).
  const selectedRegion = hasLocationField
    ? (location.regions[0] ?? "")
    : ((values.region as string) ?? "");

  const set = (key: string, value: FormValues[string]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (hasLocationField && location.regions.length === 0) {
      setError("Select at least one region so the project can be placed on the map.");
      return;
    }

    setLoading(true);

    const payload: Record<string, unknown> = { ...values };

    const groups = new Map<string, Record<string, unknown>>();
    for (const f of fields) {
      if (f.group && f.key in values) {
        if (!groups.has(f.group)) groups.set(f.group, {});
        groups.get(f.group)![f.key] = values[f.key];
      }
    }
    for (const [group, groupValues] of groups) {
      delete payload[Object.keys(groupValues)[0]];
      payload[group] = groupValues;
    }

    // Flatten the picker into the columns the API expects — the same shape
    // AdminProjectForm sends, so both paths produce identical records.
    if (hasLocationField) {
      delete payload.location;
      Object.assign(payload, {
        regions: location.regions,
        districts: location.districts,
        region: location.regions[0] ?? "",
        district: location.districts[0] ?? "",
        locationNote: location.locationNote,
        coordinates:
          location.lat !== "" && location.lng !== ""
            ? { lat: Number(location.lat), lng: Number(location.lng) }
            : undefined,
      });
    }

    try {
      await apiSend("POST", type, payload);
      router.replace("/partner");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30";

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
        {fields.map((f) => {
          // Conditional fields: the project partner email only makes sense
          // once a role is chosen, and its label follows that choice.
          if (f.showWhen) {
            const gate = String(values[f.showWhen.key] ?? "");
            if (!f.showWhen.equals.includes(gate)) return null;
          }
          if (f.labelWhen) {
            const label = f.labelWhen.labels[String(values[f.labelWhen.key] ?? "")];
            if (label) f = { ...f, label };
          }
          if (f.type === "location") {
            return (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                <LocationPicker value={location} onChange={setLocation} />
                {f.help && <p className="text-[11px] text-gray-400 mt-1">{f.help}</p>}
              </div>
            );
          }

          if (f.type === "attachments") {
            return (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                {f.help && <p className="text-[11px] text-gray-400 mb-2">{f.help}</p>}
                <AttachmentsUpload
                  value={(values[f.key] as ProjectAttachment[]) ?? []}
                  onChange={(attachments) => set(f.key, attachments)}
                />
              </div>
            );
          }

          if (f.type === "gallery") {
            const images = (values[f.key] as string[]) ?? [];
            return (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                {f.help && <p className="text-[11px] text-gray-400 mb-2">{f.help}</p>}
                {images.length > 0 && (
                  <ul className="flex flex-wrap gap-2 mb-2">
                    {images.map((url, i) => (
                      <li key={`${url}-${i}`} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-16 w-16 object-cover rounded border border-gray-200" />
                        <button
                          type="button"
                          onClick={() => set(f.key, images.filter((_, idx) => idx !== i))}
                          aria-label="Remove image"
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-white border border-gray-300 text-gray-600 text-xs leading-none hover:bg-red-50 hover:text-red-600"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <FileUpload
                  kind="image"
                  label="Add a photo"
                  value=""
                  onUploaded={(url) => set(f.key, [...images, url])}
                />
              </div>
            );
          }

          if (f.type === "tags") {
            const tags = (values[f.key] as string[]) ?? [];
            return (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{f.label}</label>
                {tags.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5 mb-2">
                    {tags.map((tag, i) => (
                      <li key={`${tag}-${i}`} className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-800 text-xs px-2.5 py-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => set(f.key, tags.filter((_, idx) => idx !== i))}
                          aria-label={`Remove ${tag}`}
                          className="text-primary-500 hover:text-red-600"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <input
                  type="text"
                  placeholder="Type a group and press Enter"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    // Enter would otherwise submit the whole form.
                    e.preventDefault();
                    const value = e.currentTarget.value.trim();
                    if (!value || tags.includes(value)) return;
                    set(f.key, [...tags, value]);
                    e.currentTarget.value = "";
                  }}
                  className={inputClass}
                />
                {f.help && <p className="text-[11px] text-gray-400 mt-1">{f.help}</p>}
              </div>
            );
          }

          if (f.type === "upload-image" || f.type === "upload-document") {
            return (
              <div key={f.key}>
                <FileUpload
                  kind={f.type === "upload-document" ? "document" : "image"}
                  label={f.label}
                  value={(values[f.key] as string) ?? ""}
                  onUploaded={(url) => set(f.key, url)}
                />
              </div>
            );
          }

          if (f.type === "checkbox") {
            return (
              <label key={f.key} className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={!!values[f.key]}
                  onChange={(e) => set(f.key, e.target.checked)}
                  className="rounded border-gray-300"
                />
                {f.label}
              </label>
            );
          }

          if (f.type === "select" || f.type === "multiselect") {
            const options = resolveOptions(f, referenceData, selectedRegion, districts);
            const isMulti = f.type === "multiselect";
            const currentValue = values[f.key];
            // Selects only ever hold slugs; attachment objects live under
            // their own field types and never reach here.
            const selectedIds: string[] = Array.isArray(currentValue)
              ? currentValue.filter((v): v is string => typeof v === "string")
              : currentValue
                ? [currentValue as string]
                : [];

            // Long, open-ended lists (partners, technologies, themes) get a
            // searchable dropdown with chips rather than a native list box:
            // a native <select multiple> requires ctrl-clicking, shows only a
            // few rows at a time, and gives no readback of what is selected.
            const isCombo =
              f.optionsFrom === "partners" ||
              f.optionsFrom === "technologies" ||
              f.optionsFrom === "themes";

            if (isCombo) {
              return (
                <div key={f.key}>
                  <label htmlFor={`${type}-${f.key}`} className="block text-xs font-semibold text-gray-600 mb-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <ComboSelect
                    inputId={`${type}-${f.key}`}
                    options={options}
                    value={selectedIds}
                    multi={isMulti}
                    placeholder={isMulti ? "Search and select…" : "Search or select…"}
                    onChange={(ids) => set(f.key, isMulti ? ids : (ids[0] ?? ""))}
                  />
                  {f.help && <p className="text-[11px] text-gray-400 mt-1">{f.help}</p>}
                </div>
              );
            }

            return (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </label>
                <select
                  multiple={isMulti}
                  value={isMulti ? selectedIds : (selectedIds[0] ?? "")}
                  required={f.required}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    set(f.key, isMulti ? selected : (selected[0] ?? ""));
                  }}
                  className={inputClass}
                >
                  {f.default && !isMulti && <option value="">{f.default}</option>}
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                {f.help && <p className="text-[11px] text-gray-400">{f.help}</p>}
              </div>
            );
          }

          if (f.type === "richtext") {
            return (
              <div key={f.key}>
                {/* The editor is a div, so <label> would have nothing to
                    point at — a span carries the text instead. */}
                <span className="block text-xs font-semibold text-gray-600 mb-1">
                  {f.label} {f.required && <span className="text-red-500">*</span>}
                </span>
                <RichTextEditor
                  value={(values[f.key] as string) ?? ""}
                  onChange={(html) => set(f.key, html)}
                />
                {f.help && <p className="text-[11px] text-gray-400 mt-1">{f.help}</p>}
              </div>
            );
          }

          return (
            <div key={f.key}>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              {f.type === "textarea" ? (
                <textarea
                  rows={3}
                  required={f.required}
                  value={(values[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={inputClass}
                />
              ) : (
                <input
                  // "date" and "month" map straight onto the native pickers,
                  // which is why the schema distinguishes them from "text".
                  type={f.type === "date" ? "date" : f.type === "month" ? "month" : "text"}
                  required={f.required}
                  value={(values[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  className={inputClass}
                />
              )}
              {f.help && <p className="text-[11px] text-gray-400 mt-1">{f.help}</p>}
            </div>
          );
        })}
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
