"use client";

// ============================================================
// Create a user account from the admin panel.
//
// Until now the only route to an account was self-registration through
// /partner/register followed by an approval — which meant staff accounts
// could not be made at all from here. This posts to the API's user-create
// endpoint, which marks the account approved and email-verified so the
// person can sign in immediately.
// ============================================================

import { useState } from "react";
import { createUser } from "@/lib/data/admin";
import { ApiError } from "@/lib/api/client";
import { ROLE, ROLE_LABELS } from "@/lib/auth/token";
import { useSession } from "@/lib/auth/useSession";
import { validateEmail, validatePhone } from "@/lib/validation/contact";

const ASSIGNABLE = [
  ROLE.SUPER_ADMIN,
  ROLE.PLATFORM_ADMIN,
  ROLE.KNOWLEDGE_MANAGER,
  ROLE.CONTENT_CONTRIBUTOR,
  ROLE.REVIEWER,
  ROLE.PARTNER,
];

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

export default function NewUserForm({
  onCreated,
  onCancel,
}: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [roles, setRoles] = useState<string[]>([ROLE.CONTENT_CONTRIBUTOR]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const { isSuperAdmin } = useSession();

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const reset = () => {
    setForm(EMPTY);
    setRoles([ROLE.CONTENT_CONTRIBUTOR]);
    setErrors({});
    setMessage("");
  };

  const toggleRole = (role: string) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

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
    if (roles.length === 0) {
      setErrors({ roles: "Choose at least one role." });
      return;
    }

    setSaving(true);
    try {
      await createUser({ ...form, roles });
      reset();
      onCreated();
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (Object.keys(fields).length === 0) {
        setMessage(err instanceof Error ? err.message : "Could not create the user.");
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
        <h2 className="text-sm font-bold text-ink-800">New user</h2>
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
        <Field label="Organisation" hint="optional" error={errors.organisation}>
          <input className="form-input" value={form.organisation} onChange={set("organisation")} autoComplete="off" />
        </Field>
        <Field label="Password" hint="at least 8 characters" error={errors.password}>
          <input className="form-input" type="password" value={form.password} onChange={set("password")} required autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" error={errors.password_confirmation}>
          <input className="form-input" type="password" value={form.password_confirmation} onChange={set("password_confirmation")} required autoComplete="new-password" />
        </Field>
      </div>

      <fieldset className="mt-4">
        <legend className="block text-xs font-semibold text-ink-600 mb-1.5">Roles</legend>
        <div className="flex flex-wrap gap-1.5">
          {ASSIGNABLE.map((role) => {
            const on = roles.includes(role);
            // Mirrors the API guard: only a super-admin can mint another.
            const locked = role === ROLE.SUPER_ADMIN && !isSuperAdmin;
            return (
              <button
                key={role}
                type="button"
                onClick={() => toggleRole(role)}
                disabled={locked}
                aria-pressed={on}
                title={locked ? "Only super-administrators can grant this role" : undefined}
                className={`text-[11px] font-medium px-2 py-1 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  on
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-ink-500 border-ink-200 hover:border-primary-300"
                }`}
              >
                {ROLE_LABELS[role] ?? role}
              </button>
            );
          })}
        </div>
        {errors.roles && <p className="text-xs text-red-600 mt-1">{errors.roles}</p>}
        <p className="text-[11px] text-ink-400 mt-1.5">
          Partner accounts use the /partner portal and cannot sign in to this admin panel.
        </p>
      </fieldset>

      <div className="mt-4 flex items-center gap-2">
        <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
          {saving ? "Creating…" : "Create user"}
        </button>
        <span className="text-[11px] text-ink-400">
          The account is active immediately — no approval step.
        </span>
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
