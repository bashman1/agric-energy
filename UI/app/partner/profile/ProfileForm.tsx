"use client";

import Link from "next/link";
import { useState } from "react";
import FileUpload from "@/components/shared/FileUpload";
import { updateMyPartner } from "@/lib/data/partner-portal";
import type { Partner } from "@/lib/types";

/**
 * Edit form for the caller's own Ecosystem profile.
 *
 * Two shapes share it: an organisation and an individual carry different
 * fields, and showing a consultant a "Registration number" box (or an NGO a
 * "Years of experience" one) is how a form teaches people it was not built for
 * them. `entityKind` picks the set.
 */

const inputClass =
  "block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30";

const labelClass = "block text-xs font-semibold text-gray-600 mb-1";

/** Areas of expertise are capped to keep a profile a claim, not a catalogue. */
const MAX_EXPERTISE = 3;

interface Props {
  partner: Partner;
  onSaved: () => void;
}

type Values = Partial<Partner>;

export default function ProfileForm({ partner, onSaved }: Props) {
  const isIndividual = partner.entityKind === "individual";

  const [values, setValues] = useState<Values>(partner);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const set = <K extends keyof Partner>(key: K, value: Partner[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if ((values.expertise?.length ?? 0) > MAX_EXPERTISE) {
      setError(`Select at most ${MAX_EXPERTISE} areas of expertise.`);
      return;
    }

    setSaving(true);

    try {
      const result = await updateMyPartner(values);
      setNotice(
        result.status === "pending"
          ? result.message ??
              "Your changes were submitted for review. Your published profile stays live until they are approved."
          : "Profile saved."
      );
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const text = (key: keyof Partner, label: string, help?: string) => (
    <div>
      <label className={labelClass} htmlFor={`profile-${String(key)}`}>{label}</label>
      <input
        id={`profile-${String(key)}`}
        type="text"
        value={(values[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value as Partner[typeof key])}
        className={inputClass}
      />
      {help && <p className="text-[11px] text-gray-400 mt-1">{help}</p>}
    </div>
  );

  const area = (key: keyof Partner, label: string, rows = 3) => (
    <div>
      <label className={labelClass} htmlFor={`profile-${String(key)}`}>{label}</label>
      <textarea
        id={`profile-${String(key)}`}
        rows={rows}
        value={(values[key] as string) ?? ""}
        onChange={(e) => set(key, e.target.value as Partner[typeof key])}
        className={inputClass}
      />
    </div>
  );

  return (
    <div className="max-w-2xl">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/partner" className="hover:text-primary-700">Dashboard</Link>
        <span className="mx-1">/</span>
        <span className="text-gray-800 font-medium">Profile</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 mb-1">
        {isIndividual ? "Your profile" : "Organisation profile"}
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        This is what visitors see on your Ecosystem page.{" "}
        {partner.published
          ? "Because it is already published, changes go to a reviewer first — your live profile stays exactly as it is until they are approved."
          : "It becomes public once an administrator approves it."}
      </p>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg px-3 py-2 text-sm">
          {notice}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-sm">
            {isIndividual ? "About you" : "About the organisation"}
          </h2>

          {text("name", isIndividual ? "Full name" : "Organisation name")}

          {isIndividual ? (
            <>
              {text("position", "Professional title or position")}
              {text("affiliation", "Affiliation", "Where you currently work, if anywhere.")}
              {text("yearsExperience", "Years of experience")}
              {area("summary", "Professional profile", 4)}
            </>
          ) : (
            <>
              {text("acronym", "Acronym")}
              {text("registrationNumber", "Registration number")}
              {text("taxId", "Tax Identification Number")}
              {text("yearEstablished", "Year established")}
              {area("mission", "Mission")}
              {area("summary", "Brief description", 4)}
            </>
          )}

          {area("description", "Full description", 5)}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-sm">Contact</h2>
          {text("email", "Email")}
          {text("phone", "Telephone")}
          {text("website", "Website")}
          {text("physicalAddress", "Physical address")}
          {!isIndividual && (
            <>
              {text("postalAddress", "Postal address")}
              {text("contactName", "Contact person")}
              {text("contactPosition", "Contact person's position")}
              {text("contactEmail", "Contact person's email")}
              {text("contactPhone", "Contact person's phone")}
            </>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-bold text-gray-900 text-sm">Focus</h2>

          <TagField
            label="Areas of expertise"
            help={`Up to ${MAX_EXPERTISE}. Press Enter after each one.`}
            max={MAX_EXPERTISE}
            values={values.expertise ?? []}
            onChange={(next) => set("expertise", next)}
          />
          <TagField
            label="Sectors of operation"
            help="Press Enter after each sector."
            values={values.sectors ?? []}
            onChange={(next) => set("sectors", next)}
          />
          <TagField
            label="Value chains"
            help="Press Enter after each value chain."
            values={values.valueChains ?? []}
            onChange={(next) => set("valueChains", next)}
          />
          <TagField
            label="Regions covered"
            help="Press Enter after each region."
            values={values.regions ?? []}
            onChange={(next) => set("regions", next)}
          />
          <TagField
            label="Districts covered"
            help="Press Enter after each district."
            values={values.districtCoverage ?? []}
            onChange={(next) => set("districtCoverage", next)}
          />
        </section>

        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="font-bold text-gray-900 text-sm mb-3">
            {isIndividual ? "Photograph" : "Logo"}
          </h2>
          <FileUpload
            kind="image"
            label={isIndividual ? "Upload a photograph" : "Upload a logo"}
            value={values.logo ?? ""}
            onUploaded={(url) => set("logo", url)}
          />
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : partner.published ? "Submit changes for review" : "Save profile"}
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

/** A free-text list built by typing and pressing Enter. */
function TagField({
  label,
  help,
  values,
  onChange,
  max,
}: {
  label: string;
  help?: string;
  values: string[];
  onChange: (next: string[]) => void;
  max?: number;
}) {
  const full = max !== undefined && values.length >= max;

  return (
    <div>
      <label className={labelClass}>{label}</label>
      {values.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-2">
          {values.map((value, i) => (
            <li
              key={`${value}-${i}`}
              className="inline-flex items-center gap-1 rounded-full bg-primary-50 text-primary-800 text-xs px-2.5 py-1"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((_, idx) => idx !== i))}
                aria-label={`Remove ${value}`}
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
        disabled={full}
        placeholder={full ? `Maximum of ${max} reached` : "Type and press Enter"}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          // Enter would otherwise submit the whole form.
          e.preventDefault();
          const value = e.currentTarget.value.trim();
          if (!value || values.includes(value) || full) return;
          onChange([...values, value]);
          e.currentTarget.value = "";
        }}
        className={`${inputClass} ${full ? "opacity-50" : ""}`}
      />
      {help && <p className="text-[11px] text-gray-400 mt-1">{help}</p>}
    </div>
  );
}
