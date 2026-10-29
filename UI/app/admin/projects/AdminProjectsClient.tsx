"use client";
import Link from "next/link";
import { Project } from "@/lib/types";
import AdminTableFilters, { type SelectFilter } from "@/components/admin/AdminTableFilters";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminListTable from "@/components/admin/AdminListTable";

export default function AdminProjectsClient({
  projects,
  onChanged,
}: {
  projects: Project[];
  onChanged?: () => void;
}) {
  const statuses = [...new Set(projects.map((p) => p.status).filter(Boolean))].sort();
  const regions = [...new Set(projects.map((p) => p.region).filter(Boolean))].sort();

  const filters: SelectFilter<Project>[] = [
    {
      key: "published",
      label: "Visibility",
      options: [
        { value: "live", label: "Live" },
        { value: "draft", label: "Draft" },
      ],
      match: (p, v) => (v === "live" ? p.published : !p.published),
    },
    ...(statuses.length
      ? [{
          key: "status",
          label: "Status",
          options: statuses.map((v) => ({ value: v, label: v })),
          match: (p: Project, v: string) => p.status === v,
        }]
      : []),
    ...(regions.length
      ? [{
          key: "region",
          label: "Region",
          options: regions.map((v) => ({ value: v, label: v })),
          match: (p: Project, v: string) => p.region === v,
        }]
      : []),
  ];

  return (
    <div>
      <AdminPageHeader
        title="Projects"
        subtitle={`${projects.length} total · ${projects.filter((p) => p.published).length} published`}
        action={{ label: "New Project", href: "/admin/projects/edit" }}
      />

      <AdminTableFilters
        items={projects as unknown as (Project & Record<string, unknown>)[]}
        searchFields={["title", "geographicCoverageSummary", "valueChain", "status"]}
        placeholder="Search projects by title, location, value chain..."
        filters={filters as SelectFilter<Project & Record<string, unknown>>[]}
      >
        {(items) => (
          <AdminListTable
            rows={items}
            type="projects"
            getKey={(p) => p.id}
            getSlug={(p) => p.slug}
            getLabel={(p) => p.title}
            onChanged={onChanged}
            emptyMessage="No projects found."
            columns={[
              { label: "Title" },
              { label: "Location" },
              { label: "Status" },
              { label: "Created by" },
              { label: "Published" },
              { label: "Featured" },
              { label: "", className: "px-4 py-3" },
            ]}
            renderRow={(p) => (
              <>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink-900 text-sm max-w-xs truncate">{p.title}</div>
                  <div className="text-xs text-ink-400 mt-0.5">{p.valueChain ?? "—"}</div>
                </td>
                <td className="px-4 py-3 text-sm text-ink-600 max-w-xs">
                  <span className="text-xs text-ink-500 line-clamp-2">{p.district || p.region || "—"}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${
                    p.status === "Active" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : p.status === "Completed" ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-yellow-50 text-yellow-700 border-yellow-200"
                  }`}>{p.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-ink-500">{p.createdBy || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.published ? "text-primary-700 bg-primary-50" : "text-ink-500 bg-ink-100"}`}>
                    {p.published ? "Live" : "Draft"}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ink-400">{p.featured ? "Yes" : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link href={`/admin/projects/edit?slug=${encodeURIComponent(p.slug)}`} className="text-xs text-primary-700 hover:text-primary-800 font-semibold">Edit</Link>
                    <Link href={`/projects/${p.slug}`} target="_blank" className="text-xs text-ink-400 hover:text-ink-600">View</Link>
                  </div>
                </td>
              </>
            )}
          />
        )}
      </AdminTableFilters>
    </div>
  );
}
