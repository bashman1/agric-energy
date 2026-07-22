"use client";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DashboardIcon,
  ChartIcon,
  SproutIcon,
  BoltIcon,
  LayersIcon,
  BuildingIcon,
  DocumentIcon,
  NewspaperIcon,
  CalendarIcon,
  CoinsIcon,
  ScaleIcon,
  MailIcon,
  CheckCircleIcon,
  UsersIcon,
  InboxIcon,
  HistoryIcon,
  SettingsIcon,
  GlobeIcon,
  LogOutIcon,
} from "@/components/shared/icons";

const navItems: { href: string; label: string; icon: ReactNode; exact?: boolean }[] = [
  { href: "/admin", label: "Dashboard", icon: <DashboardIcon />, exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: <ChartIcon /> },
  { href: "/admin/projects", label: "Projects", icon: <SproutIcon /> },
  { href: "/admin/technologies", label: "Technologies", icon: <BoltIcon /> },
  { href: "/admin/themes", label: "Themes", icon: <LayersIcon /> },
  { href: "/admin/partners", label: "Partners", icon: <BuildingIcon /> },
  { href: "/admin/resources", label: "Resources", icon: <DocumentIcon /> },
  { href: "/admin/posts", label: "News & Stories", icon: <NewspaperIcon /> },
  { href: "/admin/events", label: "Events", icon: <CalendarIcon /> },
  { href: "/admin/opportunities", label: "Opportunities", icon: <CoinsIcon /> },
  { href: "/admin/policies", label: "Policies", icon: <ScaleIcon /> },
  { href: "/admin/newsletter", label: "Newsletter", icon: <MailIcon /> },
  { href: "/admin/review", label: "Review Queue", icon: <CheckCircleIcon /> },
  { href: "/admin/users", label: "Users", icon: <UsersIcon /> },
  { href: "/admin/submissions", label: "Submissions", icon: <InboxIcon /> },
  { href: "/admin/audit", label: "Audit Trail", icon: <HistoryIcon /> },
  { href: "/admin/site-config", label: "Site Config", icon: <SettingsIcon /> },
];

const isActive = (item: typeof navItems[0], pathname: string) =>
  item.exact
    ? pathname === item.href
    : pathname === item.href || (pathname.startsWith(item.href) && pathname !== item.href);

function SidebarContent({
  pathname,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/10">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-xs shrink-0">AE</div>
          <div>
            <div className="text-white font-display font-semibold text-sm leading-tight">Agri-Energy Desk</div>
            <div className="text-ink-400 text-xs leading-tight">Admin Portal</div>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={isActive(item, pathname) ? "page" : undefined}
            className={`admin-nav-link ${isActive(item, pathname) ? "active" : ""}`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1">
        <Link href="/" target="_blank" className="admin-nav-link" onClick={onNavigate}>
          <GlobeIcon /> View Public Site
        </Link>
        <button
          onClick={onLogout}
          className="admin-nav-link w-full text-left text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <LogOutIcon /> Logout
        </button>
      </div>
    </>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* ── Desktop sidebar (lg+) ────────────────────────────── */}
      <aside className="hidden lg:flex w-60 bg-ink-900 text-ink-300 flex-col min-h-screen shrink-0">
        <SidebarContent pathname={pathname} onNavigate={closeMobile} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile: top bar with hamburger ──────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-ink-900 border-b border-white/10 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-xs">AE</div>
          <span className="text-white font-display font-semibold text-sm">Admin Portal</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-ink-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Toggle navigation"
        >
          {mobileOpen ? (
            /* X icon */
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            /* Hamburger icon */
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Mobile drawer ────────────────────────────────────── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close navigation"
            className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
            onClick={closeMobile}
          />
          {/* Slide-in panel */}
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 z-40 w-64 bg-ink-900 text-ink-300 flex flex-col shadow-2xl">
            <SidebarContent pathname={pathname} onNavigate={closeMobile} onLogout={handleLogout} />
          </aside>
        </>
      )}
    </>
  );
}
