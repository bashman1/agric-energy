"use client";
import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import type { Partner, Technology, Theme } from "@/lib/types";
import ComboSelect, { type ComboOption } from "@/components/admin/ComboSelect";
import Link from "next/link";

const PARTNER_TYPES = [
    "Government Institution",
    "International NGO",
    "Local NGO",
    "Development Bank / Donor",
    "Private Sector / Technology Provider",
    "Research / Academic Institution",
    "Farmer Organisation",
    "UN Agency",
];

const REGIONS = ["Central", "Eastern", "Northern", "Western", "Buganda", "Bunyoro", "Busoga",
    "Toro", "Ankole", "Acholi", "Lango", "Karamoja", "Elgon", "West Nile", "National"];

interface Props {
    partner: Partial<Partner>;
    mode?: "edit" | "new";
    technologies: Technology[];
    themes: Theme[];
}

export default function AdminPartnerForm({ partner, mode = "edit", technologies, themes }: Props) {
    const router = useRouter();

    const techOptions: ComboOption[] = technologies.map((t) => ({ id: t.slug, label: t.name }));
    const themeOptions: ComboOption[] = themes.map((t) => ({ id: t.slug, label: t.name }));

    const [form, setForm] = useState<Partial<Partner>>({
        name: "",
        type: PARTNER_TYPES[0],
        summary: "",
        description: "",
        website: "",
        email: "",
        phone: "",
        logo: "",
        regions: [],
        districtCoverage: [],
        technologyIds: [],
        themeIds: [],
        projectIds: [],
        featured: false,
        published: false,
        ...partner,
    });

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    const set = <K extends keyof Partner>(field: K, value: Partner[K]) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const inputClass = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100";
    const labelClass = "block text-xs font-semibold text-gray-600 mb-1";
    const uid = useId();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMsg(null);
        try {
            const isNew = mode === "new";
            const url = isNew ? "/api/partners" : `/api/partners/${partner.slug}`;
            const method = isNew ? "POST" : "PUT";
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                const data = await res.json();
                setMsg({ type: "success", text: isNew ? "Partner created!" : "Partner updated!" });
                router.refresh();
                if (isNew && data.data?.slug) router.push(`/admin/partners/${data.data.slug}`);
            } else {
                const err = await res.json();
                setMsg({ type: "error", text: err.error ?? "Failed to save." });
            }
        } catch {
            setMsg({ type: "error", text: "Network error. Please try again." });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/partners/${partner.slug}`, { method: "DELETE" });
            if (res.ok) {
                router.push("/admin/partners");
                router.refresh();
            } else {
                setMsg({ type: "error", text: "Failed to delete partner." });
            }
        } catch {
            setMsg({ type: "error", text: "Network error." });
        } finally {
            setDeleting(false);
        }
    };

    // Region toggling
    const toggleRegion = (r: string) => {
        const current = form.regions ?? [];
        set("regions", current.includes(r) ? current.filter((x) => x !== r) : [...current, r]);
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

                    {/* Core identity */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="font-bold text-gray-900 text-sm mb-4">Identity</h2>
                        <div className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor={`${uid}-name`} className={labelClass}>Name *</label>
                                    <input
                                        id={`${uid}-name`}
                                        type="text"
                                        className={inputClass}
                                        value={form.name ?? ""}
                                        onChange={(e) => set("name", e.target.value)}
                                        required
                                        placeholder="e.g. Ministry of Agriculture"
                                    />
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-type`} className={labelClass}>Type *</label>
                                    <select id={`${uid}-type`} className={inputClass} value={form.type ?? PARTNER_TYPES[0]} onChange={(e) => set("type", e.target.value)}>
                                        {PARTNER_TYPES.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor={`${uid}-summary`} className={labelClass}>Summary *</label>
                                <textarea
                                    id={`${uid}-summary`}
                                    className={inputClass}
                                    rows={2}
                                    value={form.summary ?? ""}
                                    onChange={(e) => set("summary", e.target.value)}
                                    required
                                    placeholder="One-to-two sentence description"
                                />
                            </div>

                            <div>
                                <label htmlFor={`${uid}-description`} className={labelClass}>Full Description</label>
                                <textarea
                                    id={`${uid}-description`}
                                    className={inputClass}
                                    rows={6}
                                    value={form.description ?? ""}
                                    onChange={(e) => set("description", e.target.value)}
                                    placeholder="Detailed description of the partner's mandate, activities and relevance to agri-energy..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact info */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="font-bold text-gray-900 text-sm mb-4">Contact Information</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={`${uid}-website`} className={labelClass}>Website</label>
                                <input id={`${uid}-website`} type="url" className={inputClass} value={form.website ?? ""} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-email`} className={labelClass}>Email</label>
                                <input id={`${uid}-email`} type="email" className={inputClass} value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="info@partner.org" />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-phone`} className={labelClass}>Phone</label>
                                <input id={`${uid}-phone`} type="tel" className={inputClass} value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} placeholder="+256 ..." />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-logo`} className={labelClass}>Logo URL</label>
                                <input id={`${uid}-logo`} type="url" className={inputClass} value={form.logo ?? ""} onChange={(e) => set("logo", e.target.value)} placeholder="https://... (external image URL)" />
                                {form.logo && (
                                    <div className="mt-2 flex items-center gap-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={form.logo} alt="Logo preview" className="h-10 object-contain border border-gray-100 rounded-lg p-1 bg-white" />
                                        <span className="text-xs text-gray-400">Logo preview</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Geographic coverage */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="font-bold text-gray-900 text-sm mb-4">Geographic Coverage</h2>
                        <div className="space-y-4">
                            <div>
                                <span id={`${uid}-regions-label`} className={labelClass}>Regions</span>
                                <div role="group" aria-labelledby={`${uid}-regions-label`} className="flex flex-wrap gap-2 mt-1">
                                    {REGIONS.map((r) => (
                                        <button
                                            key={r}
                                            type="button"
                                            onClick={() => toggleRegion(r)}
                                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${(form.regions ?? []).includes(r)
                                                    ? "bg-primary-700 text-white border-primary-700"
                                                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-primary-400"
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label htmlFor={`${uid}-districts`} className={labelClass}>District Coverage <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                                <input
                                    id={`${uid}-districts`}
                                    type="text"
                                    className={inputClass}
                                    value={(form.districtCoverage ?? []).join(", ")}
                                    onChange={(e) => set("districtCoverage", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                                    placeholder="e.g. Kampala, Wakiso, Gulu"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Technologies & Themes */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h2 className="font-bold text-gray-900 text-sm mb-4">Technologies &amp; Themes</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor={`${uid}-tech`} className={labelClass}>Related Technologies</label>
                                <ComboSelect
                                    inputId={`${uid}-tech`}
                                    options={techOptions}
                                    value={form.technologyIds ?? []}
                                    onChange={(ids) => set("technologyIds", ids)}
                                    multi={true}
                                    placeholder="Search technologies…"
                                />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-themes`} className={labelClass}>Related Themes</label>
                                <ComboSelect
                                    inputId={`${uid}-themes`}
                                    options={themeOptions}
                                    value={form.themeIds ?? []}
                                    onChange={(ids) => set("themeIds", ids)}
                                    multi={true}
                                    placeholder="Search themes…"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Sidebar ── */}
                <div className="space-y-4">
                    {/* Visibility */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                        <h3 className="font-bold text-gray-900 text-sm mb-4">Visibility</h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={!!form.published} onChange={(e) => set("published", e.target.checked)} className="w-4 h-4 rounded accent-primary-700" />
                                <span className="text-sm text-gray-700">Published (visible on public site)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={!!form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 rounded accent-primary-700" />
                                <span className="text-sm text-gray-700">Featured (shown on homepage slider)</span>
                            </label>
                        </div>
                    </div>

                    {/* Logo preview card */}
                    {form.logo && (
                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                            <h3 className="font-bold text-gray-900 text-sm mb-3">Logo Preview</h3>
                            <div className="flex items-center justify-center bg-gray-50 rounded-lg p-4 border border-gray-100 h-24">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={form.logo} alt="Partner logo" className="max-h-full max-w-full object-contain" />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-2.5 bg-primary-700 text-white text-sm font-bold rounded-lg hover:bg-primary-800 transition-colors disabled:opacity-50"
                        >
                            {saving ? "Saving…" : mode === "new" ? "Create Partner" : "Save Changes"}
                        </button>
                        {mode === "edit" && (
                            <Link
                                href={`/partners/${partner.slug}`}
                                target="_blank"
                                className="w-full py-2 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors text-center"
                            >
                                Preview Public Page →
                            </Link>
                        )}
                        <Link href="/admin/partners" className="w-full py-2 text-gray-400 hover:text-gray-600 text-sm text-center transition-colors">
                            ← Back to Partners
                        </Link>
                        {mode === "edit" && (
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={handleDelete}
                                className="w-full py-2 text-red-500 hover:text-red-700 border border-red-100 hover:border-red-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                {deleting ? "Deleting…" : "Delete Partner"}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </form>
    );
}
