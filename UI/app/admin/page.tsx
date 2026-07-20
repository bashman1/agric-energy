import { getAllProjects } from "@/lib/data/projects";
import { getAllTechnologies } from "@/lib/data/technologies";
import { getAllThemes } from "@/lib/data/themes";
import { getAllPartners } from "@/lib/data/partners";
import { getAllResources } from "@/lib/data/resources";
import { getAuthToken } from "@/lib/auth/session";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const token = await getAuthToken();
  const [projects, technologies, themes, partners, resources] = await Promise.all([
    getAllProjects(token),
    getAllTechnologies(token),
    getAllThemes(token),
    getAllPartners(token),
    getAllResources(token),
  ]);

  const stats = [
    { label: "Projects", count: projects.length, pub: projects.filter((p) => p.published).length, icon: "🏗️", href: "/admin/projects", color: "border-primary-200 bg-primary-50" },
    { label: "Technologies", count: technologies.length, pub: technologies.filter((t) => t.published).length, icon: "⚡", href: "/admin/technologies", color: "border-accent-200 bg-accent-50" },
    { label: "Themes", count: themes.length, pub: themes.filter((t) => t.published).length, icon: "📚", href: "/admin/themes", color: "border-purple-200 bg-purple-50" },
    { label: "Partners", count: partners.length, pub: partners.filter((p) => p.published).length, icon: "🤝", href: "/admin/partners", color: "border-secondary-200 bg-secondary-50" },
    { label: "Resources", count: resources.length, pub: resources.filter((r) => r.published).length, icon: "📄", href: "/admin/resources", color: "border-emerald-200 bg-emerald-50" },
  ];

  const recentProjects = [...projects].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()).slice(0, 5);

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">Overview of all content in the Agri-Energy Desk platform.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className={`block rounded-xl border p-4 hover:shadow-md transition-shadow ${s.color}`}>
            <div className="text-2xl mb-2">{s.icon}</div>
            <div className="text-2xl font-bold text-gray-900">{s.count}</div>
            <div className="text-sm font-medium text-gray-600">{s.label}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.pub} published</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: "Add New Project", href: "/admin/projects/new", icon: "+" },
              { label: "Add New Technology", href: "/admin/technologies/new", icon: "+" },
              { label: "Add New Partner", href: "/admin/partners/new", icon: "+" },
              { label: "Add New Resource", href: "/admin/resources/new", icon: "+" },
              { label: "Edit Site Config", href: "/admin/site-config", icon: "⚙️" },
            ].map((a) => (
              <Link key={a.label} href={a.href}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                <span className="w-5 h-5 flex items-center justify-center bg-primary-100 text-primary-700 rounded font-bold text-xs">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-bold text-gray-900 text-sm mb-4">Recently Updated Projects</h2>
          <div className="space-y-2">
            {recentProjects.map((p) => (
              <Link key={p.id} href={`/admin/projects/${p.slug}`}
                className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0 hover:text-primary-700 group">
                <span className="truncate text-gray-700 group-hover:text-primary-700 transition-colors">{p.title}</span>
                <span className={`text-xs shrink-0 ml-2 px-1.5 py-0.5 rounded-full font-medium ${p.published ? "text-emerald-700 bg-emerald-50" : "text-gray-500 bg-gray-100"}`}>
                  {p.published ? "Live" : "Draft"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Platform note */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-700 font-semibold mb-1">⚠️ Phase 1 Prototype</p>
        <p className="text-xs text-amber-600 leading-relaxed">
          This platform uses JSON file-based storage. All changes made through the admin interface are written directly to <code className="font-mono">/data</code> JSON files on disk.
          The architecture is designed for easy migration to a database in Phase 2.
        </p>
      </div>
    </div>
  );
}
