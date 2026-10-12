"use client";
import { useEffect, useState } from "react";
import type { AdminUser } from "@/lib/data/admin";
import { apiGet, apiSend } from "@/lib/api/client";
import { PARTNER_ACCOUNT_ROLES, ROLE, ROLE_LABELS, roleLockReason } from "@/lib/auth/token";
import { useSession } from "@/lib/auth/useSession";
import NewUserForm, { type PartnerOption } from "./NewUserForm";
import AdminTableFilters, { type SelectFilter } from "@/components/admin/AdminTableFilters";
import Pagination, { usePagination } from "@/components/admin/Pagination";

/**
 * Users split into two populations that never share roles (the API refuses
 * an account holding both): NREP staff, who work in this admin panel, and
 * platform partners, who use the /partner portal on behalf of an organisation.
 */
type Category = "nrep" | "partner";

/** A partner role, or a link to an organisation, makes it a partner account. */
function categoryOf(u: AdminUser): Category {
  return u.partnerId || u.roles.some((r) => (PARTNER_ACCOUNT_ROLES as readonly string[]).includes(r))
    ? "partner"
    : "nrep";
}

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
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<Category>("nrep");
  const [partners, setPartners] = useState<PartnerOption[]>([]);
  const { isSeniorAdmin } = useSession();

  useEffect(() => {
    apiGet<PartnerOption[]>("partners", [], { params: { admin: true } }).then((list) =>
      setPartners([...list].sort((a, b) => a.name.localeCompare(b.name)))
    );
  }, []);

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

  /** Link an existing partner account to its organisation, keeping its roles. */
  const linkPartner = (u: AdminUser, partner: string) =>
    call(u.id, () => apiSend("PUT", `users/${u.id}/roles`, { roles: u.roles, partner }));

  const byCategory: Record<Category, AdminUser[]> = { nrep: [], partner: [] };
  for (const u of users) byCategory[categoryOf(u)].push(u);
  const shownUsers = byCategory[category];

  const pending = users.filter((u) => u.status === "pending");

  // Built from the data so the dropdowns never offer an empty result, and
  // so a new role or organisation shows up without touching this file.
  const organisations = [...new Set(shownUsers.map((u) => u.organisation).filter(Boolean))].sort();
  const presentRoles = [...new Set(shownUsers.flatMap((u) => u.roles))].sort();

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
    ...(category === "partner" && organisations.length
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
            Create staff accounts, approve registrations and manage roles.
            {pending.length > 0 && (
              <span className="ml-1 font-semibold text-secondary-700">
                {pending.length} pending approval.
              </span>
            )}
          </p>
        </div>
        {!creating && (
          <button type="button" onClick={() => { setEditing(null); setCreating(true); }} className="btn btn-primary shrink-0">
            New user
          </button>
        )}
      </div>

      {editing && (
        <NewUserForm
          key={editing.id}
          partners={partners}
          editing={editing}
          onCreated={() => { setEditing(null); onChanged(); }}
          onCancel={() => setEditing(null)}
        />
      )}

      {creating && !editing && (
        <NewUserForm
          partners={partners}
          onCreated={() => { setCreating(false); onChanged(); }}
          onCancel={() => setCreating(false)}
        />
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <div role="tablist" aria-label="User category" className="mb-4 flex gap-1 border-b border-ink-200">
        {([
          ["nrep", "NREP staff"],
          ["partner", "Platform partners"],
        ] as const).map(([key, label]) => {
          const active = category === key;
          const waiting = byCategory[key].filter((u) => u.status === "pending").length;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(key)}
              className={`-mb-px px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                active
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-ink-500 hover:text-ink-800"
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs font-normal text-ink-400">{byCategory[key].length}</span>
              {waiting > 0 && (
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-secondary-50 text-secondary-700">
                  {waiting} pending
                </span>
              )}
            </button>
          );
        })}
      </div>

      <AdminTableFilters
        key={category}
        items={shownUsers as (AdminUser & Record<string, unknown>)[]}
        searchFields={["name", "email", "organisation"]}
        placeholder="Search by name, email or organisation…"
        filters={filters as SelectFilter<AdminUser & Record<string, unknown>>[]}
        dateField={{ key: "createdAt", label: "Registered" }}
      >
        {(shown) => (
          <UsersTable
            rows={shown}
            busy={busy}
            isSeniorAdmin={isSeniorAdmin}
            partners={category === "partner" ? partners : null}
            approve={approve}
            suspend={suspend}
            edit={(u) => {
              setCreating(false);
              setEditing(u);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            linkPartner={linkPartner}
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
  isSeniorAdmin,
  partners,
  approve,
  suspend,
  edit,
  linkPartner,
}: {
  rows: AdminUser[];
  busy: number | null;
  isSeniorAdmin: boolean;
  /** Organisations to link to; null on the staff tab, which has none. */
  partners: PartnerOption[] | null;
  approve: (u: AdminUser) => void;
  suspend: (u: AdminUser) => void;
  edit: (u: AdminUser) => void;
  linkPartner: (u: AdminUser, partner: string) => void;
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
              <th className="text-left font-semibold px-4 py-3">Role</th>
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
                  <RoleCell u={u} isSeniorAdmin={isSeniorAdmin} />
                  {partners && !u.partnerId && (
                    <select
                      className="form-input mt-2 text-xs py-1"
                      value=""
                      disabled={busy === u.id}
                      onChange={(e) => e.target.value && linkPartner(u, e.target.value)}
                      aria-label={`Link ${u.name} to an organisation`}
                    >
                      <option value="">Not linked — link to organisation…</option>
                      {partners.map((p) => (
                        <option key={p.slug} value={p.slug}>{p.name}</option>
                      ))}
                    </select>
                  )}
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {/* Super-admin accounts are listed only to super-admins,
                      and even then are edited on the server, not here. */}
                  {!u.roles.includes(ROLE.SUPER_ADMIN) && (
                    <button
                      onClick={() => edit(u)}
                      disabled={busy === u.id}
                      className="mr-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-ink-200 text-ink-700 hover:bg-ink-50 disabled:opacity-50"
                    >
                      Edit
                    </button>
                  )}
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

/**
 * The role(s) an account actually holds, as badges. Changing a role is done
 * from Edit; the note underneath says why that is unavailable when the
 * account holds a role the viewer may not take away (a super-admin, or an
 * organisation admin seen by another organisation admin).
 */
function RoleCell({ u, isSeniorAdmin }: { u: AdminUser; isSeniorAdmin: boolean }) {
  const lockReason = u.roles.includes(ROLE.SUPER_ADMIN)
    ? "Super administrator — managed on the server"
    : u.roles.map((r) => roleLockReason(r, isSeniorAdmin)).find(Boolean) ?? null;

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {u.roles.length === 0 ? (
          <span className="text-xs text-ink-400">No role</span>
        ) : (
          u.roles.map((r) => (
            <span
              key={r}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full border bg-primary-50 text-primary-700 border-primary-200"
            >
              {ROLE_LABELS[r] ?? r}
            </span>
          ))
        )}
      </div>
      {lockReason && <p className="mt-1.5 text-[11px] text-ink-400">{lockReason}</p>}
    </div>
  );
}
