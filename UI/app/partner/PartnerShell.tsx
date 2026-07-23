// ============================================================
// Partner portal shell — client half of app/partner/layout.tsx.
//
// Split out so the layout can keep exporting `metadata` (a server-only
// export) while the session lookup happens in the browser: under the
// static build there is no request-time session to read.
// ============================================================
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RouteGuard from "@/components/auth/RouteGuard";
import { useSession } from "@/lib/auth/useSession";
import PartnerNav from "./PartnerNav";

// Pages inside /partner that must stay reachable while logged out.
const PUBLIC_ROUTES = ["/partner/login", "/partner/register"];

export default function PartnerShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoggedIn } = useSession();

  const isPublic = PUBLIC_ROUTES.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`)
  );

  const chrome = (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/partner" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center font-bold text-xs">
              AE
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm">Agri-Energy Desk</div>
              <div className="text-primary-200 text-[11px]">Partner Portal</div>
            </div>
          </Link>
          <PartnerNav loggedIn={isLoggedIn} name={user?.name ?? ""} />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );

  // Login and registration render the chrome without the guard; everything
  // else under /partner requires an authenticated account.
  if (isPublic) return chrome;

  return <RouteGuard area="partner">{chrome}</RouteGuard>;
}
