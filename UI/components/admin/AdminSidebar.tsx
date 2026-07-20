"use client";
import Link from "next/link";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/analytics", label: "Analytics", icon: "📈" },
  { href: "/admin/projects", label: "Projects", icon: "🏗️" },
  { href: "/admin/technologies", label: "Technologies", icon: "⚡" },
  { href: "/admin/themes", label: "Themes", icon: "📚" },
  { href: "/admin/partners", label: "Partners", icon: "🤝" },
  { href: "/admin/resources", label: "Resources", icon: "📄" },
  { href: "/admin/posts", label: "News & Stories", icon: "📰" },
  { href: "/admin/events", label: "Events", icon: "📅" },
  { href: "/admin/opportunities", label: "Opportunities", icon: "💰" },
  { href: "/admin/policies", label: "Policies", icon: "📜" },
  { href: "/admin/newsletter", label: "Newsletter", icon: "✉️" },
  { href: "/admin/review", label: "Review Queue", icon: "✅" },
  { href: "/admin/users", label: "Users", icon: "👥" },
  { href: "/admin/submissions", label: "Submissions", icon: "📬" },
  { href: "/admin/audit", label: "Audit Trail", icon: "🗂️" },
  { href: "/admin/site-config", label: "Site Config", icon: "⚙️" },
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
      <div className="px-4 py-5 border-b border-gray-800">
        <Link href="/admin" className="flex items-center gap-2.5" onClick={onNavigate}>
          <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-xs shrink-0">AE</div>
          <div>
            <div className="text-white font-bold text-xs leading-tight">Agri-Energy Desk</div>
            <div className="text-gray-500 text-xs leading-tight">Admin Portal</div>
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
            className={`admin-nav-link ${isActive(item, pathname) ? "active" : ""}`}
          >
            <span className="text-sm">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <Link href="/" target="_blank" className="admin-nav-link text-xs" onClick={onNavigate}>
          <span>🌐</span> View Public Site
        </Link>
        <button
          onClick={onLogout}
          className="admin-nav-link w-full text-left text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
        >
          <span>🚪</span> Logout
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
      <aside className="hidden lg:flex w-56 bg-gray-950 text-gray-300 flex-col min-h-screen shrink-0">
        <SidebarContent pathname={pathname} onNavigate={closeMobile} onLogout={handleLogout} />
      </aside>

      {/* ── Mobile: top bar with hamburger ──────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between bg-gray-950 border-b border-gray-800 px-4 py-3">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary-700 flex items-center justify-center text-white font-bold text-xs">AE</div>
          <span className="text-white font-bold text-sm">Admin Portal</span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
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
          <aside className="lg:hidden fixed top-0 left-0 bottom-0 z-40 w-64 bg-gray-950 text-gray-300 flex flex-col shadow-2xl">
            <SidebarContent pathname={pathname} onNavigate={closeMobile} onLogout={handleLogout} />
          </aside>
        </>
      )}
    </>
  );
}
