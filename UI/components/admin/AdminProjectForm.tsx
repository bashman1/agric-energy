"use client";
import { useState, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import type { Project, Partner, Technology, Theme } from "@/lib/types";
import LocationPicker, { type LocationValue } from "@/components/admin/LocationPicker";
import ComboSelect, { type ComboOption } from "@/components/admin/ComboSelect";
import PartnerCreatePanel from "@/components/admin/PartnerCreatePanel";
import AttachmentsUpload from "@/components/shared/AttachmentsUpload";
import Link from "next/link";
import { ApiError, apiSend } from "@/lib/api/client";

interface Props {
  project: Partial<Project>;
  mode?: "edit" | "new";
  partners: Partner[];
  technologies: Technology[];
  themes: Theme[];
}

type PartnerPanel = { open: boolean; field: "funding" | "implementing"; initialName: string };

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

  // For partner combo (single-select), we store selected as an array of one
  const [fundingPartnerIds, setFundingPartnerIds] = useState<string[]>(
    project.fundingPartner ? [project.fundingPartner] : []
  );

  // ── Partner creation panel ─────────────────────────────────────────────────
  const [panel, setPanel] = useState<PartnerPanel>({ open: false, field: "funding", initialName: "" });

  const openPartnerPanel = useCallback((field: "funding" | "implementing", name: string) => {
    setPanel({ open: true, field, initialName: name });
  }, []);

  const handlePartnerCreated = useCallback((slug: string, _name: string) => {
    if (panel.field === "funding") {
      setFundingPartnerIds([slug]);
    } else {
      setForm((prev) => ({
        ...prev,
        implementingPartnerIds: [...(prev.implementingPartnerIds ?? []), slug],
      }));
    }
    setPanel((p) => ({ ...p, open: false }));
  }, [panel.field]);

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

    // Resolve funding partner: if selected id matches an existing partner slug, use slug; else use raw text
    const resolvedFundingPartner = fundingPartnerIds[0] ?? "";

    const payload: Partial<Project> = {
      ...form,
      fundingPartner: resolvedFundingPartner,
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

              {/* Funding Partner (single select, free-text or existing partner) */}
              <div>
                <label htmlFor={`${uid}-funding-partner`} className={labelClass}>Funding Partner</label>
                <ComboSelect
                  inputId={`${uid}-funding-partner`}
                  options={partnerOptions}
                  value={fundingPartnerIds}
                  onChange={setFundingPartnerIds}
                  multi={false}
                  placeholder="Search existing partners or type a name…"
                  allowCreate={true}
                  createLabel="Use as funding partner (free text)"
                  onCreateNew={(name) => openPartnerPanel("funding", name)}
                />
                <p className="text-[11px] text-ink-400 mt-1">Pick from the list, type a freeform name, or create a new partner profile.</p>
                {panel.open && panel.field === "funding" && (
                  <PartnerCreatePanel
                    initialName={panel.initialName}
                    onCreated={handlePartnerCreated}
                    onCancel={() => setPanel((p) => ({ ...p, open: false }))}
                  />
                )}
              </div>

              {/* Implementing Partners (multi-select) */}
              <div>
                <label htmlFor={`${uid}-implementing-partners`} className={labelClass}>Implementing Partner(s)</label>
                <ComboSelect
                  inputId={`${uid}-implementing-partners`}
                  options={partnerOptions}
                  value={form.implementingPartnerIds ?? []}
                  onChange={(ids) => set("implementingPartnerIds", ids)}
                  multi={true}
                  placeholder="Search and select partners…"
                  onCreateNew={(name) => openPartnerPanel("implementing", name)}
                  createLabel="Create new partner"
                />
                {panel.open && panel.field === "implementing" && (
                  <PartnerCreatePanel
                    initialName={panel.initialName}
                    onCreated={handlePartnerCreated}
                    onCancel={() => setPanel((p) => ({ ...p, open: false }))}
                  />
                )}
              </div>

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
