"use client";

// ============================================================
// Organisation team management, in the partner portal.
//
// An organisation admin adds and manages their own colleagues here, without
// a platform administrator having to do it for them.
//
// Everything on this page is scoped to the signed-in admin's organisation
// by the API, which reads partner_id from the session and refuses any role
// outside Roles::PARTNER_TEAM_ROLES. The affordances below mirror those
// limits; they do not create them.
// ============================================================

import { useCallback, useEffect, useState } from "react";
import {
  createTeamMember,
  getPartnerTeam,
  setTeamMemberStatus,
  type AdminUser,
} from "@/lib/data/admin";
import { ApiError } from "@/lib/api/client";
import { PARTNER_TEAM_ROLES, ROLE, ROLE_LABELS } from "@/lib/auth/token";
import { useSession } from "@/lib/auth/useSession";
import { validateEmail, validatePhone } from "@/lib/validation/contact";

const EMPTY = { name: "", email: "", phone: "", password: "", password_confirmation: "" };

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-primary-50 text-primary-700 border-primary-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  pending: "bg-secondary-50 text-secondary-700 border-secondary-200",
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

export default function TeamClient() {
  const { user, canManagePartnerTeam } = useSession();
  const [team, setTeam] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [roles, setRoles] = useState<string[]>([ROLE.PARTNER_CONTENT_CONTRIBUTOR]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await getPartnerTeam());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load your team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!canManagePartnerTeam) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <h1 className="text-lg font-bold text-gray-900">Team management</h1>
        <p className="text-sm text-gray-500 mt-2">
          Only your organisation&apos;s administrator can manage its team.
        </p>
      </div>
    );
  }

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((s) => ({ ...s, [k]: e.target.value }));

  const toggleRole = (role: string) =>
    setRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const reset = () => {
    setForm(EMPTY);
    setRoles([ROLE.PARTNER_CONTENT_CONTRIBUTOR]);
    setErrors({});
    setMessage("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setMessage("");

    const contactErrors: Record<string, string> = {};
    const emailError = validateEmail(form.email, { label: "Email", required: true });
    if (emailError) contactErrors.email = emailError;
    const phoneError = validatePhone(form.phone, { label: "Phone" });
    if (phoneError) contactErrors.phone = phoneError;
    if (Object.keys(contactErrors).length > 0) {
      setErrors(contactErrors);
      return;
    }

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
      await createTeamMember({ ...form, roles });
      reset();
      setAdding(false);
      await load();
    } catch (err) {
      const fields = fieldErrors(err);
      setErrors(fields);
      if (Object.keys(fields).length === 0) {
        setMessage(err instanceof Error ? err.message : "Could not add this person.");
      }
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (member: AdminUser, status: "approved" | "suspended") => {
    setBusy(member.id);
    setMessage("");
    try {
      await setTeamMemberStatus(member.id, status);
      await load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update that account.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Your team</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            People in your organisation. They sign in to this portal to submit
            content for review — they do not get access to the platform admin area.
          </p>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} className="btn btn-primary shrink-0">
            Add person
          </button>
        )}
      </div>

      {message && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {message}
        </div>
      )}

      {adding && (
        <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-gray-800">Add someone to your organisation</h2>
            <button
              type="button"
              onClick={() => { reset(); setAdding(false); }}
              className="text-xs text-gray-500 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" error={errors.name}>
              <input className="form-input" value={form.name} onChange={set("name")} required />
            </Field>
            <Field label="Email" error={errors.email}>
              <input className="form-input" type="email" value={form.email} onChange={set("email")} required />
            </Field>
            <Field label="Phone" hint="optional" error={errors.phone}>
              <input className="form-input" type="tel" value={form.phone} onChange={set("phone")} />
            </Field>
            <div className="hidden sm:block" />
            <Field label="Password" hint="at least 8 characters" error={errors.password}>
              <input className="form-input" type="password" value={form.password} onChange={set("password")} required autoComplete="new-password" />
            </Field>
            <Field label="Confirm password" error={errors.password_confirmation}>
              <input className="form-input" type="password" value={form.password_confirmation} onChange={set("password_confirmation")} required autoComplete="new-password" />
            </Field>
          </div>

          <fieldset className="mt-4">
            <legend className="block text-xs font-semibold text-gray-600 mb-1.5">Role in your organisation</legend>
            <div className="flex flex-wrap gap-1.5">
              {PARTNER_TEAM_ROLES.map((role) => {
                const on = roles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    aria-pressed={on}
                    className={`text-[11px] font-medium px-2 py-1 rounded-full border transition-colors ${
                      on
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white text-gray-500 border-gray-200 hover:border-primary-300"
                    }`}
                  >
                    {ROLE_LABELS[role] ?? role}
                  </button>
                );
              })}
            </div>
            {errors.roles && <p className="text-xs text-red-600 mt-1">{errors.roles}</p>}
            <p className="text-[11px] text-gray-400 mt-1.5">
              An Organisation Admin can add and manage people here, like you.
              Content submitted by any of these roles still goes to the platform
              review queue before it appears publicly.
            </p>
          </fieldset>

          <div className="mt-4">
            <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-50">
              {saving ? "Adding…" : "Add to organisation"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <p className="px-4 py-6 text-sm text-gray-500">Loading your team…</p>
        ) : team.length === 0 ? (
          <p className="px-4 py-6 text-sm text-gray-500">No one here yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left font-semibold px-4 py-3">Person</th>
                <th className="text-left font-semibold px-4 py-3">Status</th>
                <th className="text-left font-semibold px-4 py-3">Role</th>
                <th className="text-right font-semibold px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {team.map((m) => {
                const isSelf = m.id === user?.userId;
                return (
                  <tr key={m.id}>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-800">
                        {m.name}
                        {isSelf && <span className="ml-2 text-[11px] font-normal text-gray-400">you</span>}
                      </div>
                      <div className="text-xs text-gray-500">{m.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        STATUS_STYLE[m.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {m.roles.map((r) => ROLE_LABELS[r] ?? r).join(", ") || "—"}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {/* No self-service here: the API refuses it too, so an
                          admin cannot lock themselves out of their own org. */}
                      {isSelf ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : m.status === "suspended" ? (
                        <button
                          onClick={() => changeStatus(m, "approved")}
                          disabled={busy === m.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 disabled:opacity-50"
                        >
                          Reactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => changeStatus(m, "suspended")}
                          disabled={busy === m.id}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
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
      <span className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
        {hint && <span className="ml-1 font-normal text-gray-400">({hint})</span>}
      </span>
      {children}
      {error && <span className="block text-xs text-red-600 mt-1">{error}</span>}
    </label>
  );
}
