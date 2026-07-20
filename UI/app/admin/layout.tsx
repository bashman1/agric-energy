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
    <div className="flex min-h-screen bg-gray-100">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar — desktop only */}
        <header className="hidden lg:flex bg-white border-b border-gray-200 px-6 py-3 items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-600">Agri-Energy Desk — Admin Portal</h2>
          <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
            Phase 1 Prototype
          </span>
        </header>
        {/* Main content — pt-20 on mobile clears the fixed hamburger bar */}
        <main className="flex-1 p-6 pt-20 lg:pt-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
