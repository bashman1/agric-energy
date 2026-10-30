"use client";
import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import type { Partner, Technology, Theme } from "@/lib/types";
import ComboSelect, { type ComboOption } from "@/components/admin/ComboSelect";
import FileUpload from "@/components/shared/FileUpload";
import {
    ORG_CATEGORIES,
    SECTORS,
    VALUE_CHAINS,
    EXPERTISE_AREAS,
    COVERAGE_SCOPES,
    EMPLOYEE_BANDS,
    BRANCH_BANDS,
    BENEFICIARY_BANDS,
    ANNUAL_BUDGET_RANGES,
    COUNTRIES,
    toOptions,
} from "@/lib/data/partnerOptions";
import Link from "next/link";
import { ApiError, apiSend, apiSendWithMeta } from "@/lib/api/client";
import { validateEmail, validatePhone } from "@/lib/validation/contact";
import { mediaUrl } from "@/lib/utils/mediaUrl";

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
        entityKind: "organization",
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
        // Individual profile (from self-registration)
        position: "",
        affiliation: "",
        yearsExperience: "",
        // Organization profile (from self-registration)
        category: "",
        acronym: "",
        registrationNumber: "",
        taxId: "",
        yearEstablished: "",
        physicalAddress: "",
        postalAddress: "",
        mission: "",
        employeesBand: "",
        branchesBand: "",
        beneficiariesBand: "",
        annualBudgetRange: "",
        contactName: "",
        contactPosition: "",
        contactEmail: "",
        contactPhone: "",
        coverageScope: [],
        countries: [],
        sectors: [],
        valueChains: [],
        expertise: [],
        ...partner,
    });

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

    // Organisations and individuals share this form; the fields that only make
    // sense for one of them are switched on this.
    const isIndividual = form.entityKind === "individual";

    const set = <K extends keyof Partner>(field: K, value: Partner[K]) =>
        setForm((prev) => ({ ...prev, [field]: value }));

    const inputClass = "w-full px-3 py-2 bg-ink-50 border border-ink-200 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100";
    const labelClass = "block text-xs font-semibold text-ink-600 mb-1";
    const uid = useId();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Both addresses and both numbers, checked before the round trip.
        const contactError =
            validateEmail(form.email ?? "", { label: "Email" }) ??
            validatePhone(form.phone ?? "", { label: "Phone" }) ??
            validateEmail(form.contactEmail ?? "", { label: "Contact email" }) ??
            validatePhone(form.contactPhone ?? "", { label: "Contact phone" });
        if (contactError) {
            setMsg({ type: "error", text: contactError });
            return;
        }
        setSaving(true);
        setMsg(null);
        try {
            const isNew = mode === "new";
            const path = isNew ? "partners" : `partners/${partner.slug}`;
            const method = isNew ? "POST" : "PUT";
            // 202 = queued as a revision; see AdminContentForm.
            const { status, data: saved, body } = await apiSendWithMeta<{ slug?: string }>(method, path, form);
            setMsg({
                type: "success",
                text: status === 202
                    ? String(body.message ?? "Your changes were submitted for review.")
                    : isNew ? "Partner created!" : "Partner updated!",
            });
            if (isNew && saved?.slug) {
                router.replace(`/admin/partners/edit?slug=${encodeURIComponent(saved.slug)}`);
            }
        } catch (err) {
            setMsg({ type: "error", text: err instanceof ApiError ? err.message : "Network error. Please try again." });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Delete "${form.name}"? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await apiSend("DELETE", `partners/${partner.slug}`);
            router.replace("/admin/partners");
        } catch (err) {
            setMsg({ type: "error", text: err instanceof ApiError ? err.message : "Network error." });
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
                    <div className="bg-white rounded-xl border border-ink-200 p-5">
                        <h2 className="font-bold text-ink-900 text-sm mb-4">Identity</h2>
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
                                    <label htmlFor={`${uid}-entity-kind`} className={labelClass}>Directory entry *</label>
                                    <select
                                        id={`${uid}-entity-kind`}
                                        className={inputClass}
                                        value={form.entityKind ?? "organization"}
                                        onChange={(e) => set("entityKind", e.target.value as "organization" | "individual")}
                                    >
                                        <option value="organization">Organisation</option>
                                        <option value="individual">Individual</option>
                                    </select>
                                </div>
                            </div>

                            {isIndividual ? (
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor={`${uid}-position`} className={labelClass}>Professional title / position</label>
                                        <input id={`${uid}-position`} type="text" className={inputClass} value={form.position ?? ""} onChange={(e) => set("position", e.target.value)} placeholder="e.g. Independent Irrigation Consultant" />
                                    </div>
                                    <div>
                                        <label htmlFor={`${uid}-affiliation`} className={labelClass}>Affiliation</label>
                                        <input id={`${uid}-affiliation`} type="text" className={inputClass} value={form.affiliation ?? ""} onChange={(e) => set("affiliation", e.target.value)} />
                                    </div>
                                    <div>
                                        <label htmlFor={`${uid}-years`} className={labelClass}>Years of experience</label>
                                        <input id={`${uid}-years`} type="text" className={inputClass} value={form.yearsExperience ?? ""} onChange={(e) => set("yearsExperience", e.target.value)} />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor={`${uid}-type`} className={labelClass}>Partner type *</label>
                                    <select id={`${uid}-type`} className={inputClass} value={form.type ?? PARTNER_TYPES[0]} onChange={(e) => set("type", e.target.value)}>
                                        {PARTNER_TYPES.map((t) => <option key={t}>{t}</option>)}
                                    </select>
                                </div>
                            )}

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
                    <div className="bg-white rounded-xl border border-ink-200 p-5">
                        <h2 className="font-bold text-ink-900 text-sm mb-4">Contact Information</h2>
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
                                <label htmlFor={`${uid}-logo`} className={labelClass}>Logo</label>
                                <div className="mb-2">
                                    <FileUpload kind="image" value={form.logo ?? ""} onUploaded={(url) => set("logo", url)} />
                                </div>
                                <input id={`${uid}-logo`} type="text" className={inputClass} value={form.logo ?? ""} onChange={(e) => set("logo", e.target.value)} placeholder="…or paste an external image URL" />
                                {form.logo && (
                                    <div className="mt-2 flex items-center gap-3">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={mediaUrl(form.logo)} alt="Logo preview" className="h-10 object-contain border border-ink-100 rounded-lg p-1 bg-white" />
                                        <span className="text-xs text-ink-400">Logo preview</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Geographic coverage */}
                    <div className="bg-white rounded-xl border border-ink-200 p-5">
                        <h2 className="font-bold text-ink-900 text-sm mb-4">Geographic Coverage</h2>
                        <div className="space-y-4">
                            <div>
                                <span id={`${uid}-scope-label`} className={labelClass}>Coverage Scope</span>
                                <div role="group" aria-labelledby={`${uid}-scope-label`} className="flex flex-wrap gap-2 mt-1">
                                    {COVERAGE_SCOPES.map((s) => {
                                        const on = (form.coverageScope ?? []).includes(s);
                                        return (
                                            <button
                                                key={s}
                                                type="button"
                                                onClick={() => set("coverageScope", on ? (form.coverageScope ?? []).filter((x) => x !== s) : [...(form.coverageScope ?? []), s])}
                                                className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${on ? "bg-primary-700 text-white border-primary-700" : "bg-ink-50 text-ink-600 border-ink-200 hover:border-primary-400"}`}
                                            >
                                                {s}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
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
                                                    : "bg-ink-50 text-ink-600 border-ink-200 hover:border-primary-400"
                                                }`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label htmlFor={`${uid}-districts`} className={labelClass}>District Coverage <span className="text-ink-400 font-normal">(comma-separated)</span></label>
                                <input
                                    id={`${uid}-districts`}
                                    type="text"
                                    className={inputClass}
                                    value={(form.districtCoverage ?? []).join(", ")}
                                    onChange={(e) => set("districtCoverage", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                                    placeholder="e.g. Kampala, Wakiso, Gulu"
                                />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-countries`} className={labelClass}>Countries <span className="text-ink-400 font-normal">(for international coverage)</span></label>
                                <ComboSelect
                                    inputId={`${uid}-countries`}
                                    options={toOptions(COUNTRIES)}
                                    value={form.countries ?? []}
                                    onChange={(ids) => set("countries", ids)}
                                    multi={true}
                                    allowCreate
                                    placeholder="Search countries…"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Organization profile */}
                    <div className="bg-white rounded-xl border border-ink-200 p-5">
                        <h2 className="font-bold text-ink-900 text-sm mb-4">Organization Profile</h2>
                        <div className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor={`${uid}-category`} className={labelClass}>Category</label>
                                    <select id={`${uid}-category`} className={inputClass} value={form.category ?? ""} onChange={(e) => set("category", e.target.value)}>
                                        <option value="">—</option>
                                        {ORG_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-acronym`} className={labelClass}>Acronym</label>
                                    <input id={`${uid}-acronym`} type="text" className={inputClass} value={form.acronym ?? ""} onChange={(e) => set("acronym", e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-regno`} className={labelClass}>Registration Number</label>
                                    <input id={`${uid}-regno`} type="text" className={inputClass} value={form.registrationNumber ?? ""} onChange={(e) => set("registrationNumber", e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-taxid`} className={labelClass}>Tax ID</label>
                                    <input id={`${uid}-taxid`} type="text" className={inputClass} value={form.taxId ?? ""} onChange={(e) => set("taxId", e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-year`} className={labelClass}>Year Established</label>
                                    <input id={`${uid}-year`} type="text" className={inputClass} value={form.yearEstablished ?? ""} onChange={(e) => set("yearEstablished", e.target.value)} placeholder="e.g. 2015" />
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-budget`} className={labelClass}>Annual Budget Range</label>
                                    <select id={`${uid}-budget`} className={inputClass} value={form.annualBudgetRange ?? ""} onChange={(e) => set("annualBudgetRange", e.target.value)}>
                                        <option value="">—</option>
                                        {ANNUAL_BUDGET_RANGES.map((b) => <option key={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-employees`} className={labelClass}>Employees</label>
                                    <select id={`${uid}-employees`} className={inputClass} value={form.employeesBand ?? ""} onChange={(e) => set("employeesBand", e.target.value)}>
                                        <option value="">—</option>
                                        {EMPLOYEE_BANDS.map((b) => <option key={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-branches`} className={labelClass}>Branches</label>
                                    <select id={`${uid}-branches`} className={inputClass} value={form.branchesBand ?? ""} onChange={(e) => set("branchesBand", e.target.value)}>
                                        <option value="">—</option>
                                        {BRANCH_BANDS.map((b) => <option key={b}>{b}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-beneficiaries`} className={labelClass}>Beneficiaries Served</label>
                                    <select id={`${uid}-beneficiaries`} className={inputClass} value={form.beneficiariesBand ?? ""} onChange={(e) => set("beneficiariesBand", e.target.value)}>
                                        <option value="">—</option>
                                        {BENEFICIARY_BANDS.map((b) => <option key={b}>{b}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label htmlFor={`${uid}-mission`} className={labelClass}>Mission</label>
                                <textarea id={`${uid}-mission`} className={inputClass} rows={2} value={form.mission ?? ""} onChange={(e) => set("mission", e.target.value)} />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor={`${uid}-physical`} className={labelClass}>Physical Address</label>
                                    <input id={`${uid}-physical`} type="text" className={inputClass} value={form.physicalAddress ?? ""} onChange={(e) => set("physicalAddress", e.target.value)} />
                                </div>
                                <div>
                                    <label htmlFor={`${uid}-postal`} className={labelClass}>Postal Address</label>
                                    <input id={`${uid}-postal`} type="text" className={inputClass} value={form.postalAddress ?? ""} onChange={(e) => set("postalAddress", e.target.value)} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sectors, value chains & expertise */}
                    <div className="bg-white rounded-xl border border-ink-200 p-5">
                        <h2 className="font-bold text-ink-900 text-sm mb-4">Sectors, Value Chains &amp; Expertise</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor={`${uid}-sectors`} className={labelClass}>Sectors of Operation</label>
                                <ComboSelect inputId={`${uid}-sectors`} options={toOptions(SECTORS)} value={form.sectors ?? []} onChange={(ids) => set("sectors", ids)} multi={true} allowCreate placeholder="Search sectors…" />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-vchains`} className={labelClass}>Value Chain Focus</label>
                                <ComboSelect inputId={`${uid}-vchains`} options={toOptions(VALUE_CHAINS)} value={form.valueChains ?? []} onChange={(ids) => set("valueChains", ids)} multi={true} allowCreate placeholder="Search value chains…" />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-expertise`} className={labelClass}>Areas of Expertise</label>
                                <ComboSelect inputId={`${uid}-expertise`} options={toOptions(EXPERTISE_AREAS)} value={form.expertise ?? []} onChange={(ids) => set("expertise", ids)} multi={true} allowCreate placeholder="Search expertise…" />
                            </div>
                        </div>
                    </div>

                    {/* Contact person */}
                    <div className="bg-white rounded-xl border border-ink-200 p-5">
                        <h2 className="font-bold text-ink-900 text-sm mb-4">Contact Person</h2>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor={`${uid}-cname`} className={labelClass}>Full Name</label>
                                <input id={`${uid}-cname`} type="text" className={inputClass} value={form.contactName ?? ""} onChange={(e) => set("contactName", e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-cposition`} className={labelClass}>Position</label>
                                <input id={`${uid}-cposition`} type="text" className={inputClass} value={form.contactPosition ?? ""} onChange={(e) => set("contactPosition", e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-cemail`} className={labelClass}>Email</label>
                                <input id={`${uid}-cemail`} type="email" className={inputClass} value={form.contactEmail ?? ""} onChange={(e) => set("contactEmail", e.target.value)} />
                            </div>
                            <div>
                                <label htmlFor={`${uid}-cphone`} className={labelClass}>Phone</label>
                                <input id={`${uid}-cphone`} type="tel" className={inputClass} value={form.contactPhone ?? ""} onChange={(e) => set("contactPhone", e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* Technologies & Themes */}
                    <div className="bg-white rounded-xl border border-ink-200 p-5">
                        <h2 className="font-bold text-ink-900 text-sm mb-4">Technologies &amp; Themes</h2>
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
                    <div className="bg-white rounded-xl border border-ink-200 p-5">
                        <h3 className="font-bold text-ink-900 text-sm mb-4">Visibility</h3>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={!!form.published} onChange={(e) => set("published", e.target.checked)} className="w-4 h-4 rounded accent-primary-700" />
                                <span className="text-sm text-ink-700">Published (visible on public site)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={!!form.featured} onChange={(e) => set("featured", e.target.checked)} className="w-4 h-4 rounded accent-primary-700" />
                                <span className="text-sm text-ink-700">Featured (shown on homepage slider)</span>
                            </label>
                        </div>
                    </div>

                    {/* Logo preview card */}
                    {form.logo && (
                        <div className="bg-white rounded-xl border border-ink-200 p-5">
                            <h3 className="font-bold text-ink-900 text-sm mb-3">Logo Preview</h3>
                            <div className="flex items-center justify-center bg-ink-50 rounded-lg p-4 border border-ink-100 h-24">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={mediaUrl(form.logo)} alt="Partner logo" className="max-h-full max-w-full object-contain" />
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
                                className="w-full py-2 border border-ink-200 text-ink-600 text-sm font-medium rounded-lg hover:bg-ink-50 transition-colors text-center"
                            >
                                Preview Public Page →
                            </Link>
                        )}
                        <Link href="/admin/partners" className="w-full py-2 text-ink-400 hover:text-ink-600 text-sm text-center transition-colors">
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
