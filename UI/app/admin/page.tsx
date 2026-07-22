import { getAllProjects } from "@/lib/data/projects";
import { getAllTechnologies } from "@/lib/data/technologies";
import { getAllThemes } from "@/lib/data/themes";
import { getAllPartners } from "@/lib/data/partners";
import { getAllResources } from "@/lib/data/resources";
import { getAuthToken } from "@/lib/auth/session";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  SproutIcon,
  BoltIcon,
  LayersIcon,
  BuildingIcon,
  DocumentIcon,
  PlusIcon,
  SettingsIcon,
  ArrowRightIcon,
} from "@/components/shared/icons";

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

  const stats: { label: string; count: number; pub: number; icon: ReactNode; href: string }[] = [
    { label: "Projects", count: projects.length, pub: projects.filter((p) => p.published).length, icon: <SproutIcon />, href: "/admin/projects" },
    { label: "Technologies", count: technologies.length, pub: technologies.filter((t) => t.published).length, icon: <BoltIcon />, href: "/admin/technologies" },
    { label: "Themes", count: themes.length, pub: themes.filter((t) => t.published).length, icon: <LayersIcon />, href: "/admin/themes" },
    { label: "Partners", count: partners.length, pub: partners.filter((p) => p.published).length, icon: <BuildingIcon />, href: "/admin/partners" },
    { label: "Resources", count: resources.length, pub: resources.filter((r) => r.published).length, icon: <DocumentIcon />, href: "/admin/resources" },
  ];

  const recentProjects = [...projects].sort((a, b) => new Date(b.updatedAt ?? 0).getTime() - new Date(a.updatedAt ?? 0).getTime()).slice(0, 5);

  const quickActions: { label: string; href: string; icon: ReactNode }[] = [
    { label: "Add New Project", href: "/admin/projects/new", icon: <PlusIcon /> },
    { label: "Add New Technology", href: "/admin/technologies/new", icon: <PlusIcon /> },
    { label: "Add New Partner", href: "/admin/partners/new", icon: <PlusIcon /> },
    { label: "Add New Resource", href: "/admin/resources/new", icon: <PlusIcon /> },
    { label: "Edit Site Config", href: "/admin/site-config", icon: <SettingsIcon /> },
  ];

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-ink-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-ink-500 mt-1">Overview of all content in the Agri-Energy Desk platform.</p>
      </div>

      {/* Stats grid — uniform white cards; colour encodes status only */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card card-hover group block p-5">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-primary-50 text-primary-700 text-lg mb-3">
              {s.icon}
            </span>
            <div className="font-display text-3xl font-semibold text-ink-900 tabular-nums">{s.count}</div>
            <div className="text-sm font-medium text-ink-700 mt-0.5">{s.label}</div>
            <div className="text-xs text-ink-400 mt-1">{s.pub} published</div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card p-5">
          <h2 className="font-semibold text-ink-900 text-sm mb-4">Quick Actions</h2>
          <div className="space-y-1">
            {quickActions.map((a) => (
              <Link key={a.label} href={a.href}
                className="flex items-center gap-3 px-3 py-2 text-sm text-ink-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors">
                <span className="inline-flex w-6 h-6 items-center justify-center bg-primary-100 text-primary-700 rounded-md">{a.icon}</span>
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-ink-900 text-sm">Recently Updated Projects</h2>
            <Link href="/admin/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-primary-700 hover:text-primary-800">
              All <ArrowRightIcon />
            </Link>
          </div>
          <div className="space-y-1">
            {recentProjects.map((p) => (
              <Link key={p.id} href={`/admin/projects/${p.slug}`}
                className="flex items-center justify-between text-sm py-2 border-b border-ink-100 last:border-0 group">
                <span className="truncate text-ink-700 group-hover:text-primary-700 transition-colors">{p.title}</span>
                <span className={`text-[11px] shrink-0 ml-2 px-2 py-0.5 rounded-full font-medium ${p.published ? "text-primary-700 bg-primary-50" : "text-ink-500 bg-ink-100"}`}>
                  {p.published ? "Live" : "Draft"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Platform note */}
      <div className="bg-secondary-50 border border-secondary-200 rounded-xl p-4">
        <p className="text-sm text-secondary-800 font-semibold mb-1">Phase 1 Prototype</p>
        <p className="text-xs text-secondary-700 leading-relaxed">
          Content is stored in PostgreSQL via the Laravel REST API. Sample data is illustrative and
          not official statistics. Partner-submitted content stays pending until an administrator approves it.
        </p>
      </div>
    </div>
  );
}
