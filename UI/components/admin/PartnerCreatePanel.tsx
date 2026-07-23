"use client";

import { useState, useId } from "react";
import { ApiError, apiSend } from "@/lib/api/client";

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

interface NewPartner {
    name: string;
    type: string;
    summary: string;
    website: string;
    email: string;
    phone: string;
}

interface Props {
    initialName?: string;          // pre-fill name from query the user typed
    onCreated: (slug: string, name: string) => void;
    onCancel: () => void;
}

export default function PartnerCreatePanel({ initialName = "", onCreated, onCancel }: Props) {
    const [form, setForm] = useState<NewPartner>({
        name: initialName,
        type: PARTNER_TYPES[0],
        summary: "",
        website: "",
        email: "",
        phone: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (k: keyof NewPartner, v: string) => setForm((p) => ({ ...p, [k]: v }));

    const inputClass =
        "w-full px-3 py-2 bg-ink-50 border border-ink-200 rounded-lg text-sm text-ink-800 focus:outline-none focus:border-primary-400 focus:ring-1 focus:ring-primary-100";
    const labelClass = "block text-xs font-semibold text-ink-600 mb-1";
    const uid = useId();

    const handleSubmit = async () => {
        if (!form.name.trim()) { setError("Partner name is required."); return; }
        setSaving(true);
        setError(null);

        try {
            const created = await apiSend<{ slug?: string }>("POST", "partners", {
                ...form,
                description: "",
                logo: "",
                regions: [],
                districtCoverage: [],
                technologyIds: [],
                themeIds: [],
                projectIds: [],
                featured: false,
                published: true,
            });
            onCreated(created?.slug ?? "", form.name);
        } catch (err) {
            setError(err instanceof ApiError ? err.message : "Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="mt-3 bg-primary-50 border border-primary-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-primary-900 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">+</span>
                    Create New Partner
                </h4>
                <button type="button" onClick={onCancel} className="text-primary-400 hover:text-primary-700 text-lg leading-none">×</button>
            </div>

            {error && (
                <p className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                        <label htmlFor={`${uid}-name`} className={labelClass}>Name *</label>
                        <input
                            id={`${uid}-name`}
                            type="text"
                            className={inputClass}
                            value={form.name}
                            onChange={(e) => set("name", e.target.value)}
                            placeholder="Organisation name"
                        />
                    </div>
                    <div>
                        <label htmlFor={`${uid}-type`} className={labelClass}>Type *</label>
                        <select id={`${uid}-type`} className={inputClass} value={form.type} onChange={(e) => set("type", e.target.value)}>
                            {PARTNER_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor={`${uid}-summary`} className={labelClass}>Summary</label>
                    <textarea
                        id={`${uid}-summary`}
                        className={inputClass}
                        rows={2}
                        value={form.summary}
                        onChange={(e) => set("summary", e.target.value)}
                        placeholder="Brief description of this partner"
                    />
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                    <div>
                        <label htmlFor={`${uid}-website`} className={labelClass}>Website</label>
                        <input id={`${uid}-website`} type="url" className={inputClass} value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." />
                    </div>
                    <div>
                        <label htmlFor={`${uid}-email`} className={labelClass}>Email</label>
                        <input id={`${uid}-email`} type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="info@partner.org" />
                    </div>
                    <div>
                        <label htmlFor={`${uid}-phone`} className={labelClass}>Phone</label>
                        <input id={`${uid}-phone`} type="tel" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+256 ..." />
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-1">
                    <button
                        type="button"
                        disabled={saving}
                        onClick={handleSubmit}
                        className="px-5 py-2 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                    >
                        {saving ? "Creating…" : "Create & Select Partner"}
                    </button>
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-ink-500 hover:text-ink-700 transition-colors">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
