"use client";
import { useState } from "react";
import Link from "next/link";

export default function PartnerRegisterPage() {
  const [form, setForm] = useState({
    name: "",
    organisation: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
  });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.password_confirmation) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Registration failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-md mx-auto text-center bg-white rounded-2xl border border-gray-200 p-8">
        <div className="text-4xl mb-3">✅</div>
        <h1 className="text-xl font-bold text-gray-900">Registration received</h1>
        <p className="text-sm text-gray-500 mt-2">
          Your account is <strong>pending administrator approval</strong>. You&rsquo;ll
          be able to sign in and submit content once an NREP administrator approves it.
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

  return (
    <div className="max-w-md mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Register as a Partner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create an account to contribute projects, technologies, resources, events and
          opportunities to the Agri-Energy Desk. Accounts are reviewed before activation.
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <Field label="Full name" value={form.name} onChange={set("name")} required />
        <Field label="Organisation" value={form.organisation} onChange={set("organisation")} />
        <Field label="Email" type="email" value={form.email} onChange={set("email")} required />
        <Field label="Phone" value={form.phone} onChange={set("phone")} />
        <Field label="Password" type="password" value={form.password} onChange={set("password")} required />
        <Field
          label="Confirm password"
          type="password"
          value={form.password_confirmation}
          onChange={set("password_confirmation")}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-primary-700 text-white font-bold rounded-lg hover:bg-primary-800 disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Create account"}
        </button>
        <p className="text-center text-xs text-gray-500">
          Already registered?{" "}
          <Link href="/partner/login" className="text-primary-700 font-semibold">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  type = "text",
  value,
  onChange,
  required,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        className="block w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30"
      />
    </div>
  );
}
