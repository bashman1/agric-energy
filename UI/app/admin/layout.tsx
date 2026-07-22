"use client";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { usePathname } from "next/navigation";

// Auth-only pages that should NOT show the admin shell
const AUTH_ROUTES = ["/admin/login"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"));

  // Auth pages (login, etc.) — render bare, no sidebar
  if (isAuthPage) {
    return <>{children}</>;
  }

  // Authenticated admin pages — render full shell with sidebar
  return (
    <div className="flex min-h-screen bg-ink-50">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — desktop only */}
        <header className="hidden lg:flex bg-white/90 backdrop-blur-sm border-b border-ink-200 px-6 py-3 items-center justify-between sticky top-0 z-20">
          <h2 className="text-sm font-semibold text-ink-600">Agri-Energy Desk — Admin Portal</h2>
          <span className="inline-flex items-center gap-1.5 text-xs text-primary-700 font-semibold bg-primary-50 border border-primary-100 px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500" aria-hidden="true" />
            Phase 1 Prototype
          </span>
        </header>
        {/* Main content — pt-20 on mobile clears the fixed hamburger bar */}
        <main className="flex-1 p-6 pt-20 lg:pt-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
