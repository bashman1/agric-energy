"use client";
import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import type { Project, Partner, Technology, Theme } from "@/lib/types";
import LocationPicker, { type LocationValue } from "@/components/admin/LocationPicker";
import ComboSelect, { type ComboOption } from "@/components/admin/ComboSelect";
import AttachmentsUpload from "@/components/shared/AttachmentsUpload";
import FileUpload from "@/components/shared/FileUpload";
import Link from "next/link";
import { ApiError, apiSend } from "@/lib/api/client";

interface Props {
  project: Partial<Project>;
  mode?: "edit" | "new";
  partners: Partner[];
  technologies: Technology[];
  themes: Theme[];
}


export default function AdminProjectForm({ project, mode = "edit", partners, technologies, themes }: Props) {
  const router = useRouter();

  // ── Combo options derived once ─────────────────────────────────────────────
  const partnerOptions: ComboOption[] = partners.map((p) => ({ id: p.slug, label: p.name }));
  const techOptions: ComboOption[] = technologies.map((t) => ({ id: t.slug, label: t.name }));
  const themeOptions: ComboOption[] = themes.map((t) => ({ id: t.slug, label: t.name }));

  // ── Form state ─────────────────────────────────────────────────────────────
  const [form, setForm] = useState<Partial<Project>>({
    region: "", district: "", locationNote: "",
    coordinates: { lat: 1.373, lng: 32.290 },
    beneficiaries: [],
    technologyIds: [],
    themeIds: [],
    implementingPartnerIds: [],
    gallery: [],
    attachments: [],
    featuredImage: "",
    status: "Active",
    published: false,
    featured: false,
    fundingPartner: "",
    ...project,
  });

  const [locationState, setLocationState] = useState<LocationValue>({
    regions: Array.isArray(project.regions) ? project.regions : (project.region ? [project.region] : []),
    districts: Array.isArray(project.districts) ? project.districts : (project.district ? [project.district] : []),
    lat: (project.coordinates?.lat ?? "") as number | "",
    lng: (project.coordinates?.lng ?? "") as number | "",
    locationNote: project.locationNote ?? "",
    region: project.region ?? "",
    district: project.district ?? "",
  });

  // ── Helper setters ─────────────────────────────────────────────────────────
  const set = (field: keyof Project, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const inputClass = "w-full px-3 py-2 bg-ink-50 border border-ink-200 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100";
  const labelClass = "block text-xs font-semibold text-ink-600 mb-1";
  const uid = useId();

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    const payload: Partial<Project> = {
      ...form,
      regions: locationState.regions,
      districts: locationState.districts,
      region: locationState.regions[0] ?? "",
      district: locationState.districts[0] ?? "",
      locationNote: locationState.locationNote,
      coordinates: locationState.lat !== "" && locationState.lng !== ""
        ? { lat: Number(locationState.lat), lng: Number(locationState.lng) }
        : { lat: 1.373, lng: 32.290 },
    };

    try {
      const isNew = mode === "new";
      const path = isNew ? "projects" : `projects/${project.slug}`;
      const method = isNew ? "POST" : "PUT";
      const saved = await apiSend<{ slug?: string }>(method, path, payload);
      setMsg({ type: "success", text: isNew ? "Project created successfully!" : "Project updated successfully!" });
      // A new record has no page until it is loaded by slug, so send the
      // editor to its own URL rather than refreshing an inert route.
      if (isNew && saved?.slug) {
        router.replace(`/admin/projects/edit?slug=${encodeURIComponent(saved.slug)}`);
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
          {msg.text}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Main column ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Core info */}
          <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
            <h2 className="font-bold text-ink-900 text-sm mb-4">Core Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor={`${uid}-title`} className={labelClass}>Title *</label>
                <input id={`${uid}-title`} type="text" className={inputClass} value={form.title ?? ""} onChange={(e) => set("title", e.target.value)} required placeholder="e.g. Solar-Powered Irrigation Scheme — Dokolo District" />
              </div>
              <div>
                <label htmlFor={`${uid}-summary`} className={labelClass}>Summary *</label>
                <textarea id={`${uid}-summary`} className={inputClass} rows={2} value={form.summary ?? ""} onChange={(e) => set("summary", e.target.value)} required placeholder="One to two sentence project summary" />
              </div>
              <div>
                <label htmlFor={`${uid}-description`} className={labelClass}>Full Description</label>
                <textarea id={`${uid}-description`} className={inputClass} rows={6} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Detailed project description..." />
              </div>
              <div>
                <label htmlFor={`${uid}-outcomes`} className={labelClass}>Outcomes &amp; Results</label>
                <textarea id={`${uid}-outcomes`} className={inputClass} rows={3} value={form.outcomes ?? ""} onChange={(e) => set("outcomes", e.target.value)} placeholder="Key outcomes, impacts, and results..." />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
            <h2 className="font-bold text-ink-900 text-sm mb-1">Geographic Location</h2>
            <p className="text-xs text-ink-500 mb-4">
              Search any place in Uganda — region, district, town, or sub-county. Coordinates are filled automatically.
            </p>
            <LocationPicker value={locationState} onChange={(val) => setLocationState(val)} />
          </div>

          {/* Partners & Technologies — now with smart combos */}
          <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
            <h2 className="font-bold text-ink-900 text-sm mb-4">Partners &amp; Technologies</h2>
            <div className="space-y-5">

              {/*
                One partner, by role and email address, replacing the old
                funding-partner select and implementing-partner multi-select.
                The API resolves the address to a registered partner and
                writes through to the same fields the public project page has
                always rendered, so nothing downstream changes — and the
                address is notified when the project is published.
              */}
              <div>
                <label htmlFor={`${uid}-partner-role`} className={labelClass}>Partner Role</label>
                <select
                  id={`${uid}-partner-role`}
                  className={inputClass}
                  value={form.partnerRole ?? ""}
                  onChange={(e) => set("partnerRole", e.target.value)}
                >
                  <option value="">Select a partner role…</option>
                  <option value="funding">Funding Partner</option>
                  <option value="implementing">Implementing Partner</option>
                </select>
              </div>

              {form.partnerRole && (
                <div>
                  <label htmlFor={`${uid}-partner-email`} className={labelClass}>
                    {form.partnerRole === "funding" ? "Funding Partner" : "Implementing Partner"} Email
                  </label>
                  <input
                    id={`${uid}-partner-email`}
                    type="email"
                    className={inputClass}
                    value={form.partnerEmail ?? ""}
                    onChange={(e) => set("partnerEmail", e.target.value)}
                    placeholder="partner@organisation.org"
                  />
                  <p className="text-[11px] text-ink-400 mt-1">
                    The address is notified by email — and in the portal, if it
                    belongs to a registered account — once this project is published.
                  </p>
                </div>
              )}

              {/* Technologies (multi-select, free-text allowed) */}
              <div>
                <label htmlFor={`${uid}-technologies`} className={labelClass}>Technologies</label>
                <ComboSelect
                  inputId={`${uid}-technologies`}
                  options={techOptions}
                  value={form.technologyIds ?? []}
                  onChange={(ids) => set("technologyIds", ids)}
                  multi={true}
                  placeholder="Search technologies…"
                  allowCreate={true}
                  createLabel="Add technology"
                />
              </div>

              {/* Themes (multi-select, curated) */}
              <div>
                <label htmlFor={`${uid}-themes`} className={labelClass}>Thematic Areas</label>
                <ComboSelect
                  inputId={`${uid}-themes`}
                  options={themeOptions}
                  value={form.themeIds ?? []}
                  onChange={(ids) => set("themeIds", ids)}
                  multi={true}
                  placeholder="Search themes…"
                />
              </div>

              {/* Value Chain */}
              <div>
                <label htmlFor={`${uid}-value-chain`} className={labelClass}>Value Chain</label>
                <input id={`${uid}-value-chain`} type="text" className={inputClass} value={form.valueChain ?? ""} onChange={(e) => set("valueChain", e.target.value)} placeholder="e.g. Dairy, Rice" />
              </div>
            </div>
          </div>

          {/* Attachments — downloadable documents shown on the public page */}
          <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
            <h2 className="font-bold text-ink-900 text-sm mb-1">Attachments</h2>
            <p className="text-xs text-ink-500 mb-4">
              Upload documents (reports, factsheets, briefs) that visitors can download from the project page.
            </p>
            <AttachmentsUpload
              value={form.attachments ?? []}
              onChange={(attachments) => set("attachments", attachments)}
            />
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4">
          {/* Featured image — the cover photo shown on cards, the project page,
              and the homepage hero deck */}
          <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
            <h3 className="font-bold text-ink-900 text-sm mb-1">Featured Image</h3>
            <p className="text-xs text-ink-500 mb-3">
              Cover photo used on project cards, the project page, and the homepage.
            </p>
            {form.featuredImage ? (
              <div className="mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.featuredImage}
                  alt="Featured"
                  className="w-full h-36 object-cover rounded-lg border border-ink-200"
                />
                <button
                  type="button"
                  onClick={() => set("featuredImage", "")}
                  className="mt-2 text-xs font-semibold text-red-600 hover:text-red-700"
                >
                  Remove image
                </button>
              </div>
            ) : null}
            <FileUpload
              kind="image"
              value={form.featuredImage}
              onUploaded={(url) => set("featuredImage", url)}
            />
          </div>

          <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
            <h3 className="font-bold text-ink-900 text-sm mb-4">Status &amp; Visibility</h3>
            <div className="space-y-3">
              <div>
                <label htmlFor={`${uid}-status`} className={labelClass}>Project Status</label>
                <select id={`${uid}-status`} className={inputClass} value={form.status ?? "Active"} onChange={(e) => set("status", e.target.value)}>
                  <option>Active</option>
                  <option>Completed</option>
                  <option>Pipeline</option>
                  <option>Suspended</option>
                </select>
              </div>
              <div>
                <label htmlFor={`${uid}-start-date`} className={labelClass}>Start Date</label>
                <input id={`${uid}-start-date`} type="month" className={inputClass} value={form.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div>
                <label htmlFor={`${uid}-end-date`} className={labelClass}>End Date</label>
                <input id={`${uid}-end-date`} type="month" className={inputClass} value={form.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.published} onChange={(e) => set("published", e.target.checked)} className="w-4 h-4 rounded accent-primary-700" />
                <span className="text-sm text-ink-700">Published (visible on public site)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={!!form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 rounded accent-primary-700" />
                <span className="text-sm text-ink-700">Featured (shown on homepage)</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-ink-200 shadow-card p-5">
            <h3 className="font-bold text-ink-900 text-sm mb-3">External URL</h3>
            <input type="url" aria-label="External URL" className={inputClass} value={form.externalUrl ?? ""} onChange={(e) => set("externalUrl", e.target.value)} placeholder="https://..." />
          </div>

          {/* Location preview */}
          {(locationState.region || locationState.district) && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-xs text-emerald-700">
              <div className="font-semibold mb-1.5">Location</div>
              {locationState.district && <div>{locationState.district}</div>}
              {locationState.region && <div className="text-emerald-600">{locationState.region}</div>}
              {locationState.lat !== "" && (
                <div className="font-mono mt-1 text-emerald-500">
                  {Number(locationState.lat).toFixed(4)}°, {Number(locationState.lng).toFixed(4)}°
                </div>
              )}
              {locationState.locationNote && (
                <div className="mt-1 text-emerald-600 italic">{locationState.locationNote}</div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <button type="submit" disabled={saving} className="w-full py-2.5 bg-primary-700 text-white text-sm font-bold rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50">
              {saving ? "Saving…" : mode === "new" ? "Create Project" : "Save Changes"}
            </button>
            {mode === "edit" && (
              <Link href={`/projects/${project.slug}`} target="_blank"
                className="w-full py-2 border border-ink-200 text-ink-600 text-sm font-medium rounded-lg hover:bg-ink-50 transition-colors text-center">
                Preview Public Page →
              </Link>
            )}
            <Link href="/admin/projects" className="w-full py-2 text-ink-400 hover:text-ink-600 text-sm text-center transition-colors">
              ← Back to Projects
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
