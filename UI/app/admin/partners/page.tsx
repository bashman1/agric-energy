"use client";

import AdminDataPage from "@/components/admin/AdminDataPage";
import { getAllPartners } from "@/lib/data/partners";
import Link from "next/link";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTableFilters, { type SelectFilter } from "@/components/admin/AdminTableFilters";
import AdminListTable from "@/components/admin/AdminListTable";
import type { Partner } from "@/lib/types";

type Row = Partner & Record<string, unknown>;

export default function AdminPartnersPage() {
  return (
    <AdminDataPage title="Manage Partners" load={() => getAllPartners()}>
      {(items, reload) => {
        const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name)) as Row[];

        // Derived so the dropdown only offers types actually in use.
        const types = [...new Set(items.map((p) => p.type).filter(Boolean))].sort();

        const filters: SelectFilter<Row>[] = [
          {
            key: "entityKind",
            label: "Kind",
            options: [
              { value: "organization", label: "Organisations" },
              { value: "individual", label: "Individuals" },
            ],
            // Records predating individual profiles carry no entityKind.
            match: (p, v) => (p.entityKind ?? "organization") === v,
          },
          {
            key: "published",
            label: "Status",
            options: [
              { value: "live", label: "Published" },
              { value: "draft", label: "Draft" },
            ],
            match: (p, v) => (v === "live" ? !!p.published : !p.published),
          },
          ...(types.length
            ? [{
                key: "type",
                label: "Partner type",
                options: types.map((t) => ({ value: t, label: t })),
                match: (p: Row, v: string) => p.type === v,
              }]
            : []),
        ];

        return (
          <div>
            <AdminPageHeader
              title="Partners"
              subtitle={`${items.length} total · ${items.filter((p) => p.published).length} published`}
              action={{ label: "New Partner", href: "/admin/partners/edit" }}
            />
            <AdminTableFilters
              items={sorted}
              searchFields={["name", "type", "position"]}
              placeholder="Search partners…"
              filters={filters}
            >
              {(shown) => (
                <AdminListTable
                  rows={shown}
                  type="partners"
                  getKey={(p) => p.id}
                  getSlug={(p) => p.slug}
                  getLabel={(p) => p.name}
                  onChanged={reload}
                  emptyMessage="No partners match these filters."
                  columns={[
                    { label: "Name" },
                    { label: "Kind" },
                    { label: "Type / Position" },
                    { label: "Regions" },
                    { label: "Published" },
                    { label: "Actions" },
                  ]}
                  renderRow={(p) => (
                    <>
                      <td>
                        <div className="font-medium text-ink-900 text-sm max-w-xs truncate">{p.name}</div>
                      </td>
                      <td>
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-ink-100 text-ink-600">
                          {p.entityKind === "individual" ? "Individual" : "Organisation"}
                        </span>
                      </td>
                      <td className="text-sm text-ink-600">
                        {p.entityKind === "individual" ? p.position || "\u2014" : p.type}
                      </td>
                      <td className="text-xs text-ink-500">{p.regions?.join(", ") || "\u2014"}</td>
                      <td>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            p.published ? "text-primary-700 bg-primary-50" : "text-ink-500 bg-ink-100"
                          }`}
                        >
                          {p.published ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/admin/partners/edit?slug=${encodeURIComponent(p.slug)}`}
                            className="text-xs text-primary-700 hover:text-primary-800 font-semibold"
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/partners/${p.slug}`}
                            target="_blank"
                            className="text-xs text-ink-400 hover:text-ink-600"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </>
                  )}
                />
              )}
            </AdminTableFilters>
          </div>
        );
      }}
    </AdminDataPage>
  );
}
