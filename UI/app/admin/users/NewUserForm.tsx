"use client";

// ============================================================
// Create an NREP staff account from the admin panel, or edit any account.
//
// Creating posts to the API's user-create endpoint, which marks the account
// approved and email-verified so the person can sign in immediately. It is
// staff only: partner accounts come from an organisation registering itself
// at /partner/register and its own admin adding colleagues on the portal's
// Team page — the API refuses a partner role here. Editing still covers
// partner accounts (role, organisation link, details).
// ============================================================

import { useState } from "react";
import { createUser, updateUser, type AdminUser, type UpdateUserInput } from "@/lib/data/admin";
import { ApiError } from "@/lib/api/client";
import { NREP_ROLES, PARTNER_ACCOUNT_ROLES, PARTNER_TEAM_ROLES, ROLE, ROLE_LABELS, roleLockReason } from "@/lib/auth/token";
import { useSession } from "@/lib/auth/useSession";
import { validateEmail, validatePhone } from "@/lib/validation/contact";

/** An organisation an account can be linked to (from GET /partners). */
export type PartnerOption = { slug: string; name: string };

type Category = "nrep" | "partner";

// Staff and partner roles never mix on one account (the API refuses it), so
// the form offers one set at a time.
const ASSIGNABLE: Record<Category, readonly string[]> = {
  nrep: NREP_ROLES,
  partner: PARTNER_ACCOUNT_ROLES,
};

const DEFAULT_ROLE: Record<Category, string> = {
  nrep: ROLE.CONTENT_CONTRIBUTOR,
  partner: ROLE.PARTNER_ADMIN,
};

const EMPTY = {
  name: "",
  email: "",
  phone: "",
  organisation: "",
  password: "",
  password_confirmation: "",
};

/** Laravel's 422 body: { message, errors: { field: [msg, …] } }. */
function fieldErrors(e: unknown): Record<string, string> {
  if (!(e instanceof ApiError) || e.status !== 422) return {};
  const payload = e.payload as { errors?: Record<string, string[]> } | undefined;
  const out: Record<string, string> = {};
  for (const [field, messages] of Object.entries(payload?.errors ?? {})) {
    if (messages?.[0]) out[field] = messages[0];
  }
  return out;
}

/**
 * Create a staff user, or — given `editing` — edit any account. In edit mode every field
 * starts from the account, the password is optional (blank keeps it), and
 * the role is only sent when it actually changed. The parent keys this
 * component by the account id, so switching accounts starts a fresh form.
 */
export default function NewUserForm({
  partners,
  editing,
  onCreated,
  onCancel,
}: {
  partners: PartnerOption[];
  editing?: AdminUser;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const startCategory: Category = editing
    ? editing.partnerId || editing.roles.some((r) => (PARTNER_ACCOUNT_ROLES as readonly string[]).includes(r))
      ? "partner"
      : "nrep"
    : "nrep";
  const [form, setForm] = useState(
    editing
      ? {
          ...EMPTY,
          name: editing.name,
          email: editing.email,
          phone: editing.phone ?? "",
          organisation: editing.organisation ?? "",
        }
      : EMPTY
  );
  const [category, setCategory] = useState<Category>(startCategory);
  const [partner, setPartner] = useState(editing?.partnerId ?? "");
  const [role, setRole] = useState<string>(editing?.roles[0] ?? DEFAULT_ROLE[startCategory]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { isSeniorAdmin } = useSession();

  // An account holding a role this admin may not take away (an organisation
  // admin, seen by another organisation admin) keeps it: details stay editable, the
  // role does not.
  const roleLock = editing
    ? editing.roles.map((r) => roleLockReason(r, isSeniorAdmin)).find(Boolean) ?? null
    : null;

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const switchCategory = (next: Category) => {
    setCategory(next);
    setRole(DEFAULT_ROLE[next]);
    setPartner("");
    setErrors({});
  };

  const reset = () => {
    setForm(EMPTY);
    setRole(DEFAULT_ROLE[category]);
    setPartner("");
    setErrors({});
    setMessage("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    // Same reasoning as the password check below: catch the obvious
    // mistakes before the round trip, and keep the message on the field.
    const contactErrors: Record<string, string> = {};
    const emailError = validateEmail(form.email, { label: "Email", required: true });
    if (emailError) contactErrors.email = emailError;
    const phoneError = validatePhone(form.phone, { label: "Phone" });
    if (phoneError) contactErrors.phone = phoneError;
    if (Object.keys(contactErrors).length > 0) {
      setErrors(contactErrors);
      return;
    }

    // Caught here as well as server-side so the user is not made to wait
    // for a round trip to learn the passwords differ.
    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: "Passwords do not match." });
      return;
    }
    if (!role && !roleLock) {
      setErrors({ roles: "Choose a role." });
      return;
    }
    // Organisation roles act on a team; without a linked organisation the
    // account would sign in to a portal with no Team page.
    if (!partner && category === "partner" && (PARTNER_TEAM_ROLES as readonly string[]).includes(role)) {
      setErrors({ partner: "Choose the organisation this account belongs to." });
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        const roleChanged = !(editing.roles.length === 1 && editing.roles[0] === role);
        const input: UpdateUserInput = {
          name: form.name,
          email: form.email,
          phone: form.phone,
          ...(category === "partner"
            ? { partner: partner || null }
            : { organisation: form.organisation, partner: null }),
          ...(roleChanged && !roleLock ? { roles: [role] } : {}),
          ...(form.password
            ? { password: form.password, password_confirmation: form.password_confirmation }
            : {}),
        };
        await updateUser(editing.id, input);
      } else {
        await createUser({ ...form, roles: [role] });
      }
      reset();
      onCreated();
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (Object.keys(fields).length === 0) {
        setMessage(err instanceof Error ? err.message : editing ? "Could not save the changes." : "Could not create the user.");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="w-full bg-white rounded-xl border border-ink-200 shadow-card p-4 mb-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-ink-800">
          {editing ? `Edit ${editing.name}` : "New user"}
        </h2>
        <button
          type="button"
          onClick={() => { reset(); onCancel(); }}
          className="text-xs text-ink-500 hover:text-ink-800"
        >
          Cancel
        </button>
      </div>

      {message && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {message}
        </div>
      )}

      {/* Edit only: a new account is always NREP staff. */}
      {editing && (
      <div role="radiogroup" aria-label="Account type" className="mb-3 inline-flex rounded-lg border border-ink-200 p-0.5">
        {([
          ["nrep", "NREP staff"],
          ["partner", "Platform partner"],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={category === key}
            onClick={() => switchCategory(key)}
            disabled={!!roleLock}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              category === key ? "bg-primary-600 text-white" : "text-ink-500 hover:text-ink-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" error={errors.name}>
          <input className="form-input" value={form.name} onChange={set("name")} required autoComplete="off" />
        </Field>
        <Field label="Email" error={errors.email}>
          <input className="form-input" type="email" value={form.email} onChange={set("email")} required autoComplete="off" />
        </Field>
        <Field label="Phone" hint="optional" error={errors.phone}>
          <input className="form-input" type="tel" value={form.phone} onChange={set("phone")} autoComplete="off" />
        </Field>
        {category === "nrep" ? (
          <Field label="Organisation" hint="optional" error={errors.organisation}>
            <input className="form-input" value={form.organisation} onChange={set("organisation")} autoComplete="off" />
          </Field>
        ) : (
          <Field label="Partner organisation" hint="required for organisation roles" error={errors.partner}>
            <select className="form-input" value={partner} onChange={(e) => setPartner(e.target.value)}>
              <option value="">None — individual partner</option>
              {partners.map((p) => (
                <option key={p.slug} value={p.slug}>{p.name}</option>
              ))}
            </select>
          </Field>
        )}
        <Field label={editing ? "New password" : "Password"} hint={editing ? "leave blank to keep" : "at least 8 characters"} error={errors.password}>
          <input className="form-input" type="password" value={form.password} onChange={set("password")} required={!editing} autoComplete="new-password" />
        </Field>
        <Field label={editing ? "Confirm new password" : "Confirm password"} error={errors.password_confirmation}>
          <input className="form-input" type="password" value={form.password_confirmation} onChange={set("password_confirmation")} required={!editing} autoComplete="new-password" />
        </Field>
      </div>

      <div className="mt-4 sm:max-w-xs">
        <Field label="Role" hint={roleLock ?? undefined} error={errors.roles}>
          <select
            className="form-input"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={!!roleLock}
            required
          >
            {roleLock && <option value={role}>{ROLE_LABELS[role] ?? role}</option>}
            {ASSIGNABLE[category]
              // Not offered at all: nobody creates a super-admin here, and
              // an organisation admin creates no administrator of any tier.
              .filter((r) => roleLockReason(r, isSeniorAdmin) === null)
              .map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
              ))}
          </select>
        </Field>
      </div>
      <p className="text-[11px] text-ink-400 mt-1.5">
        {category === "nrep"
          ? "NREP staff sign in to this admin panel."
          : "Partner accounts use the /partner portal. The Organisation Admin gets the Team menu there to add colleagues."}
      </p>

      <div className="mt-4 flex items-center gap-2">
        <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
          {editing ? (saving ? "Saving…" : "Save changes") : saving ? "Creating…" : "Create user"}
        </button>
        {!editing && (
          <span className="text-[11px] text-ink-400">
            The account is active immediately — no approval step.
          </span>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink-600 mb-1">
        {label}
        {hint && <span className="ml-1 font-normal text-ink-400">({hint})</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
