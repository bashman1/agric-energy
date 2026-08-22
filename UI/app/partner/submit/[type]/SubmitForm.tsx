"use client";
import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FIELD_SCHEMAS, TYPE_LABELS, type FieldDef, type OptionsFrom } from "./schemas";
import FileUpload from "@/components/shared/FileUpload";
import { apiSend } from "@/lib/api/client";
import { fetchDistrictMeta, type DistrictMeta, type UgandaRegion } from "@/lib/geo/ugandaGeo";

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

type FormValues = Record<string, string | boolean | string[]>;

function resolveOptions(
  field: FieldDef,
  referenceData: ReferenceData,
  partnerTypeFilter: string,
  selectedRegion: string,
  districts: DistrictMeta[]
): { id: string; label: string }[] {
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
    case "partners-by-type": {
      const typeFilter = partnerTypeFilter.toLowerCase();
      if (!typeFilter) return [];
      return referenceData.partners
        .filter((p) => p.type.toLowerCase() === typeFilter)
        .map((p) => ({ id: p.id, label: p.label }));
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
  const [partnerTypeFilter, setPartnerTypeFilter] = useState("");
  const [districts, setDistricts] = useState<DistrictMeta[]>([]);

  useEffect(() => {
    fetchDistrictMeta().then(setDistricts).catch(() => {});
  }, []);

  const selectedRegion = (values.region as string) ?? "";

  const set = (key: string, value: string | boolean | string[]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
            const options = resolveOptions(f, referenceData, partnerTypeFilter, selectedRegion, districts);
            const isMulti = f.type === "multiselect";
            const currentValue = values[f.key];
            const selectedIds = Array.isArray(currentValue) ? currentValue : currentValue ? [currentValue as string] : [];

            if (f.optionsFrom === "partners-by-type") {
              return (
                <div key={f.key} className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {f.label} {f.required && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    value={partnerTypeFilter}
                    onChange={(e) => {
                      setPartnerTypeFilter(e.target.value);
                      set(f.key, []);
                    }}
                    className={inputClass}
                  >
                    <option value="">Select partner type…</option>
                    {referenceData.taxonomy.partnerTypes.map((pt) => (
                      <option key={pt.id} value={pt.label}>{pt.label}</option>
                    ))}
                  </select>
                  <select
                    multiple={isMulti}
                    value={selectedIds}
                    required={f.required}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                      set(f.key, isMulti ? selected : (selected[0] ?? ""));
                    }}
                    disabled={!partnerTypeFilter}
                    className={`${inputClass} ${!partnerTypeFilter ? "opacity-50" : ""}`}
                  >
                    {!partnerTypeFilter && <option value="">Select a partner type first…</option>}
                    {partnerTypeFilter && options.length === 0 && <option value="">No partners of this type.</option>}
                    {options.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                  {f.help && <p className="text-[11px] text-gray-400">{f.help}</p>}
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
                  value={selectedIds}
                  required={f.required}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map((o) => o.value);
                    set(f.key, isMulti ? selected : (selected[0] ?? ""));
                  }}
                  className={`${inputClass} ${f.dependsOn && !selectedRegion ? "opacity-50" : ""}`}
                >
                  {f.default && !isMulti && <option value="">{f.default}</option>}
                  {f.dependsOn && !selectedRegion && <option value="">Select a region first…</option>}
                  {options.map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
                {f.help && <p className="text-[11px] text-gray-400">{f.help}</p>}
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
                  type="text"
                  required={f.required}
                  value={(values[f.key] as string) ?? ""}
                  onChange={(e) => set(f.key, e.target.value)}
                  placeholder={f.type === "date" ? "YYYY-MM-DD" : undefined}
                  className={inputClass}
                />
              )}
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
