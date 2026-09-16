"use client";
import { useState } from "react";
import type { AdminUser } from "@/lib/data/admin";
import { apiSend } from "@/lib/api/client";
import { ROLE, ROLE_LABELS } from "@/lib/auth/token";
import { useSession } from "@/lib/auth/useSession";
import NewUserForm from "./NewUserForm";
import AdminTableFilters, { type SelectFilter } from "@/components/admin/AdminTableFilters";
import Pagination, { usePagination } from "@/components/admin/Pagination";

/**
 * Roles shown as assignable pills, in tier order: platform-wide first, then
 * the organisation-scoped ones.
 *
 * The organisation roles have to be listed even though partner admins grant
 * them from their own portal — a pill list that omitted them would render an
 * account holding `partner-admin` with every pill switched off, which reads
 * as "no roles" rather than "a role this table cannot show".
 */
const ALL_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.PLATFORM_ADMIN,
  ROLE.KNOWLEDGE_MANAGER,
  ROLE.CONTENT_CONTRIBUTOR,
  ROLE.PARTNER,
  ROLE.PARTNER_ADMIN,
  ROLE.PARTNER_KNOWLEDGE_MANAGER,
  ROLE.PARTNER_CONTENT_CONTRIBUTOR,
];

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-secondary-50 text-secondary-700 border-secondary-200",
  approved: "bg-primary-50 text-primary-700 border-primary-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
};

export default function UsersClient({
  users,
  onChanged,
}: {
  users: AdminUser[];
  /** Refetch the list — router.refresh() is inert in a static export. */
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const { isSuperAdmin } = useSession();

  const call = async (id: number, run: () => Promise<unknown>) => {
    setBusy(id);
    setError("");
    try {
      await run();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(null);
    }
  };

  const approve = (u: AdminUser) =>
    call(u.id, () => apiSend("POST", `users/${u.id}/approve`));

  const suspend = (u: AdminUser) =>
    call(u.id, () => apiSend("POST", `users/${u.id}/suspend`));

  const toggleRole = (u: AdminUser, role: string) => {
    const roles = u.roles.includes(role)
      ? u.roles.filter((r) => r !== role)
      : [...u.roles, role];
    call(u.id, () => apiSend("PUT", `users/${u.id}/roles`, { roles }));
  };

  const pending = users.filter((u) => u.status === "pending");

  // Built from the data so the dropdowns never offer an empty result, and
  // so a new role or organisation shows up without touching this file.
  const organisations = [...new Set(users.map((u) => u.organisation).filter(Boolean))].sort();
  const presentRoles = [...new Set(users.flatMap((u) => u.roles))].sort();

  const filters: SelectFilter<AdminUser>[] = [
    {
      key: "status",
      label: "Status",
      options: [
        { value: "pending", label: "Pending approval" },
        { value: "approved", label: "Approved" },
        { value: "suspended", label: "Suspended" },
      ],
      match: (u, v) => u.status === v,
    },
    ...(presentRoles.length
      ? [{
          key: "role",
          label: "Role",
          options: presentRoles.map((r) => ({ value: r, label: ROLE_LABELS[r] ?? r })),
          match: (u: AdminUser, v: string) => u.roles.includes(v),
        }]
      : []),
    ...(organisations.length
      ? [{
          key: "organisation",
          label: "Partner / organisation",
          options: organisations.map((o) => ({ value: o, label: o })),
          match: (u: AdminUser, v: string) => u.organisation === v,
        }]
      : []),
  ];

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-900">Users</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Create accounts, approve registrations and manage roles.
            {pending.length > 0 && (
              <span className="ml-1 font-semibold text-secondary-700">
                {pending.length} pending approval.
              </span>
            )}
          </p>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className="btn btn-primary shrink-0">
            New user
          </button>
        )}
      </div>

      {creating && (
        <NewUserForm
          onCreated={() => { setCreating(false); onChanged(); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <AdminTableFilters
        items={users as (AdminUser & Record<string, unknown>)[]}
        searchFields={["name", "email", "organisation"]}
        placeholder="Search by name, email or organisation…"
        filters={filters as SelectFilter<AdminUser & Record<string, unknown>>[]}
        dateField={{ key: "createdAt", label: "Registered" }}
      >
        {(shown) => (
          <UsersTable
            rows={shown}
            busy={busy}
            isSuperAdmin={isSuperAdmin}
            approve={approve}
            suspend={suspend}
            toggleRole={toggleRole}
          />
        )}
      </AdminTableFilters>
    </div>
  );
}

/**
 * The table itself, split out so `usePagination` has a component to live in —
 * the filtered rows only exist inside AdminTableFilters' render prop, and a
 * hook cannot be called there.
 */
function UsersTable({
  rows,
  busy,
  isSuperAdmin,
  approve,
  suspend,
  toggleRole,
}: {
  rows: AdminUser[];
  busy: number | null;
  isSuperAdmin: boolean;
  approve: (u: AdminUser) => void;
  suspend: (u: AdminUser) => void;
  toggleRole: (u: AdminUser, role: string) => void;
}) {
  const { currentPage, setCurrentPage, itemsPerPage, setItemsPerPage, totalItems, paginatedItems } =
    usePagination(rows, 1, 10);

  return (
    <div>
      <div className="bg-white rounded-xl border border-ink-200 shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-ink-50 text-ink-500 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left font-semibold px-4 py-3">User</th>
              <th className="text-left font-semibold px-4 py-3">Status</th>
              <th className="text-left font-semibold px-4 py-3">Roles</th>
              <th className="text-right font-semibold px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100">
            {paginatedItems.length === 0 && (
              <tr>
                <td colSpan={4} className="text-center text-ink-400 py-10 text-sm">
                  No users match these filters.
                </td>
              </tr>
            )}
            {paginatedItems.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-4 py-3">
                  <div className="font-semibold text-ink-800">{u.name}</div>
                  <div className="text-xs text-ink-500">{u.email}</div>
                  {u.organisation && (
                    <div className="text-xs text-ink-400">{u.organisation}</div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      STATUS_STYLE[u.status] ?? "bg-ink-50 text-ink-600 border-ink-200"
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_ROLES.map((role) => {
                      const on = u.roles.includes(role);
                      // Only super-admins may grant the super-admin role or
                      // change a super-admin's roles (mirrors the API guard).
                      const locked =
                        role === ROLE.SUPER_ADMIN && !isSuperAdmin
                          ? true
                          : u.roles.includes(ROLE.SUPER_ADMIN) && !isSuperAdmin;
                      return (
                        <button
                          key={role}
                          onClick={() => toggleRole(u, role)}
                          disabled={busy === u.id || locked}
                          title={locked ? "Only super-administrators can change this" : undefined}
                          className={`text-[11px] font-medium px-2 py-0.5 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {u.status === "pending" && (
                    <button
                      onClick={() => approve(u)}
                      disabled={busy === u.id}
                      className="px-3 py-1.5 text-xs font-bold rounded-lg bg-primary-700 text-white hover:bg-primary-800 disabled:opacity-50"
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
                      className="ml-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-primary-200 text-primary-700 hover:bg-primary-50 disabled:opacity-50"
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

      {totalItems > 0 && (
        <Pagination
          className="mt-4"
          totalItems={totalItems}
          currentPage={currentPage}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(size) => {
            setItemsPerPage(size);
            setCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}
