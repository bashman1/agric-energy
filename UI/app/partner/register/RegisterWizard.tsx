"use client";

// ============================================================
// Partner registration wizard.
//
// Step 1 chooses account type. Individuals get a single details step;
// organizations get a structured multi-step profile (category → info →
// coverage → sectors/value-chains → profile → expertise → contact →
// account & review). One flat state object is posted to
// Laravel's /api/v1/auth/register on the final step. Reuses ComboSelect for
// multi-selects and fetchDistrictMeta/UGANDA_REGIONS for coverage.
// ============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import ComboSelect from "@/components/admin/ComboSelect";
import { TextField, TextArea, SelectField, CheckboxGroup, RadioGroup, labelClass } from "./fields";
import { UGANDA_REGIONS } from "@/lib/geography/nominatim";
import { fetchDistrictMeta } from "@/lib/geo/ugandaGeo";
import { register } from "@/lib/auth/actions";
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

type AccountType = "" | "individual" | "organization";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const INITIAL = {
  accountType: "" as AccountType,
  // login account
  name: "",
  email: "",
  username: "",
  phone: "",
  password: "",
  password_confirmation: "",
  // organization info
  category: "",
  partnerType: "",
  orgName: "",
  acronym: "",
  registrationNumber: "",
  taxId: "",
  yearEstablished: "",
  website: "",
  telephone: "",
  physicalAddress: "",
  postalAddress: "",
  // arrays
  coverageScope: [] as string[],
  regions: [] as string[],
  districtCoverage: [] as string[],
  countries: [] as string[],
  sectors: [] as string[],
  valueChains: [] as string[],
  expertise: [] as string[],
  // profile
  mission: "",
  description: "",
  employeesBand: "",
  branchesBand: "",
  beneficiariesBand: "",
  annualBudgetRange: "",
  // contact person
  contactName: "",
  contactPosition: "",
  contactEmail: "",
  contactPhone: "",
};

type FormState = typeof INITIAL;

const STEP_TITLES: Record<string, string> = {
  account: "Account type",
  personal: "Your details",
  category: "Organization category",
  partner_type: "Partner type",
  info: "Organization information",
  coverage: "Geographic coverage",
  focus: "Sectors & value chains",
  profile: "Organization profile",
  expertise: "Areas of expertise",
  contact: "Contact person",
  credentials: "Account & review",
};

function stepKeysFor(t: AccountType): string[] {
  if (t === "individual") return ["account", "personal"];
  if (t === "organization")
    return ["account", "category", "partner_type", "info", "coverage", "focus", "profile", "expertise", "contact", "credentials"];
  return ["account"];
}

export default function RegisterWizard() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [districtOpts, setDistrictOpts] = useState<{ id: string; label: string }[]>([]);

  const up =
    <K extends keyof FormState>(k: K) =>
    (v: FormState[K]) =>
      setForm((s) => ({ ...s, [k]: v }));

  const keys = stepKeysFor(form.accountType);
  const key = keys[step] ?? "account";
  const isLast = step === keys.length - 1;

  // The "Eco System" nav links straight into a flow (?type=individual or
  // ?type=organization), landing the user on the first real question
  // instead of the account-type chooser. They can still step Back to it.
  //
  // Read from location rather than useSearchParams: the latter would bail
  // this page's Suspense subtree out of prerendering, which is the same
  // reason lib/hooks/useUrlFilters.ts does it this way.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("type");
    if (requested === "individual" || requested === "organization") {
      setForm((s) => ({ ...s, accountType: requested }));
      setStep(1);
    }
  }, []);

  // Load district options lazily once the org flow is chosen.
  useEffect(() => {
    if (form.accountType !== "organization" || districtOpts.length) return;
    let alive = true;
    fetchDistrictMeta()
      .then((ds) => {
        if (alive) setDistrictOpts(ds.map((d) => ({ id: d.name, label: d.name })));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [form.accountType, districtOpts.length]);

  // Prefill contact email from org email during the info step.
  useEffect(() => {
    if (form.accountType === "organization" && form.email && !form.contactEmail) {
      setForm((s) => ({ ...s, contactEmail: s.email }));
    }
  }, [form.email, form.contactEmail, form.accountType]);

  function pickType(t: AccountType) {
    setForm((s) => ({ ...s, accountType: t }));
    setError("");
    setStep(1);
  }

  function validate(k: string): string | null {
    const f = form;
    switch (k) {
      case "account":
        if (!f.accountType) return "Please choose an account type.";
        return null;
      case "personal":
        if (!f.name.trim()) return "Full name is required.";
        if (!EMAIL_RE.test(f.email)) return "A valid email is required.";
        if (!f.username.trim()) return "Username is required.";
        if (f.password.length < 8) return "Password must be at least 8 characters.";
        if (f.password !== f.password_confirmation) return "Passwords do not match.";
        return null;
      case "category":
        if (!f.category) return "Please select an organization category.";
        return null;
      case "partner_type":
        if (!f.partnerType) return "Please select a partner type.";
        return null;
      case "info":
        if (!f.orgName.trim()) return "Organization name is required.";
        if (!f.registrationNumber.trim()) return "Registration number is required.";
        if (!f.taxId.trim()) return "Tax Identification Number is required.";
        if (!f.physicalAddress.trim()) return "Physical address is required.";
        if (!f.sectors.length) return "Please select at least one sector.";
        if (!f.email.trim()) return "Organisation email is required.";
        return null;
      case "contact":
        if (!f.contactName.trim()) return "Contact person's full name is required.";
        if (!f.contactPosition.trim()) return "Contact person's position is required.";
        if (!EMAIL_RE.test(f.contactEmail)) return "A valid contact email is required.";
        if (!f.contactPhone.trim()) return "Contact person's phone number is required.";
        return null;
      case "credentials":
        if (!EMAIL_RE.test(f.email)) return "A valid login email is required.";
        if (!f.username.trim()) return "Username is required.";
        if (f.password.length < 8) return "Password must be at least 8 characters.";
        if (f.password !== f.password_confirmation) return "Passwords do not match.";
        return null;
      default:
        if (k === "profile") {
          if (!f.mission.trim()) return "Mission is required.";
          if (!f.description.trim()) return "Brief description is required.";
          return null;
        }
        if (k === "expertise") {
          if (!f.expertise.length) return "Please select at least one area of expertise.";
          if (f.expertise.length > 3) return "Select up to 3 areas of expertise.";
          return null;
        }
        return null;
    }
  }

  function next() {
    const err = validate(key);
    if (err) {
      setError(err);
      return;
    }
    setError("");
    setStep((s) => s + 1);
  }

  function back() {
    setError("");
    setStep((s) => Math.max(0, s - 1));
  }

  function buildBody(): Record<string, unknown> {
    const base = {
      accountType: form.accountType,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    };
    if (form.accountType === "individual") {
      return { ...base, name: form.name, phone: form.phone };
    }
    return {
      ...base,
      name: form.contactName,
      phone: form.contactPhone,
      username: form.username,
      category: form.category,
      partnerType: form.partnerType,
      orgName: form.orgName,
      acronym: form.acronym,
      registrationNumber: form.registrationNumber,
      taxId: form.taxId,
      yearEstablished: form.yearEstablished,
      website: form.website,
      telephone: form.telephone,
      physicalAddress: form.physicalAddress,
      postalAddress: form.postalAddress,
      coverageScope: form.coverageScope,
      regions: form.regions,
      districtCoverage: form.districtCoverage,
      countries: form.countries,
      sectors: form.sectors,
      valueChains: form.valueChains,
      mission: form.mission,
      description: form.description,
      employeesBand: form.employeesBand,
      branchesBand: form.branchesBand,
      beneficiariesBand: form.beneficiariesBand,
      annualBudgetRange: form.annualBudgetRange,
      expertise: form.expertise,
      contactName: form.contactName,
      contactPosition: form.contactPosition,
      contactEmail: form.contactEmail,
      contactPhone: form.contactPhone,
    };
  }

  async function submit() {
    const err = validate(key);
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register(buildBody());
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center bg-white rounded-2xl border border-gray-200 p-8">
        <div className="text-4xl mb-3">✅</div>
        <h1 className="text-xl font-bold text-gray-900">Registration received</h1>
        <p className="text-sm text-gray-500 mt-2">
          Your account is <strong>pending administrator approval</strong>. You&rsquo;ll be
          able to sign in once an NREP administrator approves it.
        </p>
        <Link
          href="/partner/login"
          className="inline-block mt-5 px-4 py-2 bg-primary-700 text-white text-sm font-bold rounded-lg"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  const showProgress = form.accountType !== "" && keys.length > 2;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Register as a Partner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create an account to contribute to the Agri-Energy Desk. Accounts are reviewed
          before activation.
        </p>
      </div>

      {showProgress && (
        <div className="mb-5">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <span className="font-semibold text-primary-700">{STEP_TITLES[key]}</span>
            <span aria-current="step">
              Step {step + 1} of {keys.length}
            </span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 rounded-full transition-all"
              style={{ width: `${((step + 1) / keys.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <StepBody
          k={key}
          form={form}
          up={up}
          pickType={pickType}
          districtOpts={districtOpts}
        />

        {/* Navigation */}
        <div className="flex items-center gap-3 pt-6 mt-6 border-t border-gray-100">
          {step > 0 && (
            <button
              type="button"
              onClick={back}
              className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-50"
            >
              Back
            </button>
          )}
          <div className="flex-1" />
          {key === "account" ? null : isLast ? (
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="px-5 py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800 disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Create account"}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="px-5 py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800"
            >
              Continue
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-gray-500 mt-4">
        Already registered?{" "}
        <Link href="/partner/login" className="text-primary-700 font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  );
}

// ── Step bodies ─────────────────────────────────────────────────────
function StepBody({
  k,
  form,
  up,
  pickType,
  districtOpts,
}: {
  k: string;
  form: FormState;
  up: <K extends keyof FormState>(k: K) => (v: FormState[K]) => void;
  pickType: (t: AccountType) => void;
  districtOpts: { id: string; label: string }[];
}) {
  switch (k) {
    case "account":
      return (
        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-gray-800 mb-2">Register as:</legend>
          {(
            [
              ["individual", "Individual", "An individual contributor or professional."],
              ["organization", "Organization", "A registered organization, company, or institution."],
            ] as const
          ).map(([val, title, desc]) => {
            const on = form.accountType === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => pickType(val)}
                aria-pressed={on}
                className={`w-full text-left flex items-start gap-3 p-4 rounded-xl border transition-colors ${
                  on
                    ? "border-primary-500 bg-primary-50"
                    : "border-gray-200 hover:border-primary-300 bg-white"
                }`}
              >
                <span
                  className={`mt-0.5 w-4 h-4 rounded-full border-2 shrink-0 ${
                    on ? "border-primary-600 bg-primary-600" : "border-gray-300"
                  }`}
                />
                <span>
                  <span className="block font-semibold text-gray-900 text-sm">{title}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>
                </span>
              </button>
            );
          })}
        </fieldset>
      );

    case "personal":
      return (
        <div className="space-y-4">
          <TextField label="Full name" value={form.name} onChange={up("name")} required autoComplete="name" />
          <TextField label="Email" type="email" value={form.email} onChange={up("email")} required autoComplete="email" />
          <TextField label="Phone" value={form.phone} onChange={up("phone")} autoComplete="tel" />
          <TextField label="Password" type="password" value={form.password} onChange={up("password")} required help="At least 8 characters." autoComplete="new-password" />
          <TextField label="Confirm password" type="password" value={form.password_confirmation} onChange={up("password_confirmation")} required autoComplete="new-password" />
        </div>
      );

    case "category":
      return (
        <SelectField
          label="Organization Category"
          value={form.category}
          onChange={up("category")}
          options={ORG_CATEGORIES}
          required
          help="Choose the category that best describes your organization."
        />
      );

    case "partner_type":
      return (
        <RadioGroup
          label="Partner Type"
          value={form.partnerType}
          onChange={up("partnerType")}
          options={["Funding Partner", "Implementing Partner"]}
          required
        />
      );

    case "info":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <TextField label="Organization Name" value={form.orgName} onChange={up("orgName")} required />
          </div>
          <TextField label="Acronym" value={form.acronym} onChange={up("acronym")} />
          <TextField label="Registration Number" value={form.registrationNumber} onChange={up("registrationNumber")} required />
          <TextField label="Tax Identification Number" value={form.taxId} onChange={up("taxId")} required help="Required" />
          <TextField label="Year Established" value={form.yearEstablished} onChange={up("yearEstablished")} placeholder="e.g. 2015" />
          <TextField label="Website" type="url" value={form.website} onChange={up("website")} placeholder="https://" />
          <TextField label="Organisation Email" type="email" value={form.email} onChange={up("email")} required />
          <TextField label="Official Telephone" value={form.telephone} onChange={up("telephone")} />
          <div className="sm:col-span-2">
            <TextField label="Physical Address" value={form.physicalAddress} onChange={up("physicalAddress")} required />
          </div>
          <div className="sm:col-span-2">
            <TextField label="Postal Address" value={form.postalAddress} onChange={up("postalAddress")} />
          </div>
        </div>
      );

    case "coverage":
      return (
        <div className="space-y-5">
          <RadioGroup
            label="Geographic Coverage"
            value={form.coverageScope[0] ?? ""}
            onChange={(v) => up("coverageScope")(v ? [v] : [])}
            options={["National", "International"]}
            required
          />
          {form.coverageScope[0] === "National" && (
            <div className="space-y-4">
              <CheckboxGroup
                label="Region(s)"
                options={UGANDA_REGIONS}
                value={form.regions}
                onChange={up("regions")}
              />
              <div>
                <span className={labelClass}>District(s)</span>
                <ComboSelect
                  multi
                  options={districtOpts}
                  value={form.districtCoverage}
                  onChange={up("districtCoverage")}
                  placeholder={districtOpts.length ? "Search districts…" : "Loading districts…"}
                />
              </div>
            </div>
          )}
          {form.coverageScope[0] === "International" && (
            <div>
              <span className={labelClass}>Country / Countries</span>
              <ComboSelect
                multi
                options={toOptions(COUNTRIES)}
                value={form.countries}
                onChange={up("countries")}
                placeholder="Search countries…"
              />
            </div>
          )}
        </div>
      );

    case "focus":
      return (
        <div className="space-y-5">
          <div>
            <span className={labelClass}>Sector of Operation</span>
            <ComboSelect
              multi
              options={toOptions(SECTORS)}
              value={form.sectors}
              onChange={up("sectors")}
              placeholder="Select sectors…"
            />
          </div>
          <div>
            <span className={labelClass}>Value Chain Focus</span>
            <ComboSelect
              multi
              options={toOptions(VALUE_CHAINS)}
              value={form.valueChains}
              onChange={up("valueChains")}
              placeholder="Select value chains…"
            />
          </div>
        </div>
      );

    case "profile":
      return (
        <div className="space-y-4">
          <TextArea label="Mission" value={form.mission} onChange={up("mission")} rows={3} required />
          <TextArea
            label="Brief Description"
            value={form.description}
            onChange={up("description")}
            maxLength={500}
            rows={4}
            required
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <SelectField label="Number of Employees" value={form.employeesBand} onChange={up("employeesBand")} options={EMPLOYEE_BANDS} />
            <SelectField label="Number of Branches" value={form.branchesBand} onChange={up("branchesBand")} options={BRANCH_BANDS} />
            <SelectField label="Beneficiaries Served" value={form.beneficiariesBand} onChange={up("beneficiariesBand")} options={BENEFICIARY_BANDS} />
            <SelectField label="Annual Budget Range" value={form.annualBudgetRange} onChange={up("annualBudgetRange")} options={ANNUAL_BUDGET_RANGES} help="Optional" />
          </div>
        </div>
      );

    case "expertise":
      return (
        <CheckboxGroup
          label="Areas of Expertise"
          options={EXPERTISE_AREAS}
          value={form.expertise}
          onChange={up("expertise")}
          max={3}
          help="Select up to 3 areas of expertise."
        />
      );

    case "contact":
      return (
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <TextField label="Full Name" value={form.contactName} onChange={up("contactName")} required />
          </div>
          <TextField label="Position" value={form.contactPosition} onChange={up("contactPosition")} required />
          <TextField label="Email" type="email" value={form.contactEmail} onChange={up("contactEmail")} required />
          <TextField label="Phone Number" value={form.contactPhone} onChange={up("contactPhone")} required />
        </div>
      );

    case "credentials":
      return (
        <div className="space-y-5">
          <ReviewSummary form={form} />
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-800">Set up your login</p>
            <TextField label="Organisation Email" type="email" value={form.email} onChange={up("email")} required help="Used to sign in." autoComplete="email" />
            <TextField label="Username" value={form.username} onChange={up("username")} required help="Organisation username." autoComplete="username" />
            <TextField label="Password" type="password" value={form.password} onChange={up("password")} required help="At least 8 characters." autoComplete="new-password" />
            <TextField label="Confirm password" type="password" value={form.password_confirmation} onChange={up("password_confirmation")} required autoComplete="new-password" />
          </div>
        </div>
      );

    default:
      return null;
  }
}

function ReviewSummary({ form }: { form: FormState }) {
  const rows: [string, string][] = [
    ["Organization", form.orgName],
    ["Category", form.category],
    ["Partner Type", form.partnerType],
    ["Coverage", form.coverageScope.join(", ")],
    ["Sectors", form.sectors.join(", ")],
    ["Value chains", form.valueChains.join(", ")],
    ["Expertise", form.expertise.join(", ")],
    ["Contact", [form.contactName, form.contactPosition].filter(Boolean).join(" · ")],
  ];
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-gray-800 mb-3">Review</p>
      <dl className="space-y-1.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-3 text-xs">
            <dt className="w-28 shrink-0 font-medium text-gray-500">{k}</dt>
            <dd className="text-gray-800">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
