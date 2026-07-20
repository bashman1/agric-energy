"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AdminUser } from "@/lib/data/admin";

const ALL_ROLES = ["super-admin", "editor", "reviewer", "partner"];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
};

export default function UsersClient({ users }: { users: AdminUser[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");

  const call = async (id: number, run: () => Promise<Response>) => {
    setBusy(id);
    setError("");
    try {
      const res = await run();
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const approve = (u: AdminUser) =>
    call(u.id, () => fetch(`/api/users/${u.id}/approve`, { method: "POST" }));

  const suspend = (u: AdminUser) =>
    call(u.id, () => fetch(`/api/users/${u.id}/suspend`, { method: "POST" }));

  const toggleRole = (u: AdminUser, role: string) => {
    const roles = u.roles.includes(role)
      ? u.roles.filter((r) => r !== role)
      : [...u.roles, role];
    call(u.id, () =>
      fetch(`/api/users/${u.id}/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles }),
      })
    );
  };

  const pending = users.filter((u) => u.status === "pending");

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Approve partner registrations and manage roles.
          {pending.length > 0 && (
            <span className="ml-1 font-semibold text-amber-600">
              {pending.length} pending approval.
            </span>
          )}
        </p>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-semibold px-4 py-3">User</th>
              <th className="text-left font-semibold px-4 py-3">Status</th>
              <th className="text-left font-semibold px-4 py-3">Roles</th>
              <th className="text-right font-semibold px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-gray-800">{u.name}</div>
                  <div className="text-xs text-gray-500">{u.email}</div>
                  {u.organisation && (
                    <div className="text-xs text-gray-400">{u.organisation}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      STATUS_STYLE[u.status] ?? "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_ROLES.map((role) => {
                      const on = u.roles.includes(role);
                      return (
                        <button
                          key={role}
                          onClick={() => toggleRole(u, role)}
                          disabled={busy === u.id}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 ${
                            on
                              ? "bg-primary-600 text-white border-primary-600"
                              : "bg-white text-gray-500 border-gray-200 hover:border-primary-300"
                          }`}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {u.status === "pending" && (
                    <button
                      onClick={() => approve(u)}
                      disabled={busy === u.id}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                  )}
                  {u.status !== "suspended" ? (
                    <button
                      onClick={() => suspend(u)}
                      disabled={busy === u.id}
                      className="ml-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => approve(u)}
                      disabled={busy === u.id}
                      className="ml-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Reactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
