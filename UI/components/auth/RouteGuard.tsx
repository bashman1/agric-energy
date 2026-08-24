// ============================================================
// RouteGuard — client-side replacement for the middleware auth guard.
//
// IMPORTANT: this is a UX affordance, not a security boundary. Under the
// static build the admin bundle is downloadable by anyone; what actually
// protects data is Laravel — every guarded endpoint checks the Sanctum
// token and the caller's role (api/routes/api.php, ContentPolicy,
// AppServiceProvider gates). Never put a secret in this bundle.
// ============================================================
"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth/useSession";

type Area = "admin" | "partner";

/** Capability a given admin path requires beyond baseline staff access. */
type Capability = "content" | "review" | "users" | "super";

/**
 * Admin sub-areas that need more than baseline staff access. A path not listed
 * here is open to any staff role (content authoring). Longest prefix wins.
 */
const ADMIN_PATH_CAPABILITY: { prefix: string; cap: Capability }[] = [
  { prefix: "/admin/site-config", cap: "super" },
  { prefix: "/admin/audit", cap: "super" },
  { prefix: "/admin/users", cap: "users" },
  { prefix: "/admin/analytics", cap: "content" },
  { prefix: "/admin/reports", cap: "content" },
  { prefix: "/admin/review", cap: "review" },
  { prefix: "/admin/submissions", cap: "content" },
  { prefix: "/admin/newsletter", cap: "content" },
];

function requiredCapability(pathname: string): Capability | null {
  const match = ADMIN_PATH_CAPABILITY
    .filter((e) => pathname === e.prefix || pathname.startsWith(e.prefix + "/"))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];
  return match?.cap ?? null;
}

export default function RouteGuard({
  area,
  children,
}: {
  area: Area;
  children: React.ReactNode;
}) {
  const { loading, isLoggedIn, isStaff, canManageContent, canReview, canManageUsers, isSuperAdmin } =
    useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Mirrors the old middleware: unauthenticated → the area's login page
  // (carrying ?from=), authenticated-but-not-staff → the partner portal.
  const denied = !isLoggedIn || (area === "admin" && !isStaff);

  useEffect(() => {
    if (loading || !denied) return;

    if (!isLoggedIn) {
      const login = area === "admin" ? "/admin/login" : "/partner/login";
      router.replace(`${login}?from=${encodeURIComponent(pathname)}`);
      return;
    }
    router.replace("/partner");
  }, [loading, denied, isLoggedIn, area, pathname, router]);

  // Render nothing until the token has been validated, otherwise a signed-in
  // user sees a flash of the login redirect on every hard navigation.
  if (loading || denied) return null;

  // Capability gate for admin sub-areas the current role can't access. Shown
  // as an inline notice rather than a redirect (which could loop). Laravel
  // still enforces this server-side — this is a UX affordance.
  if (area === "admin") {
    const cap = requiredCapability(pathname);
    const permitted =
      cap === null ||
      (cap === "content" && canManageContent) ||
      (cap === "review" && canReview) ||
      (cap === "users" && canManageUsers) ||
      (cap === "super" && isSuperAdmin);

    if (!permitted) {
      return (
        <div className="max-w-lg mx-auto mt-16 bg-white rounded-xl border border-ink-200 shadow-card p-8 text-center">
          <div className="text-3xl mb-3">🔒</div>
          <h1 className="text-lg font-display font-semibold text-ink-900">Access restricted</h1>
          <p className="text-sm text-ink-500 mt-2">
            Your role doesn&apos;t have access to this section. If you think this is a
            mistake, contact a platform administrator.
          </p>
          <Link
            href="/admin"
            className="inline-block mt-5 px-4 py-2 text-sm font-semibold rounded-lg bg-primary-700 text-white hover:bg-primary-800 transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>
      );
    }
  }

  return <>{children}</>;
}

/** Convenience wrapper — `user` is guaranteed non-null inside. */
export function useGuardedUser() {
  const { user } = useSession();
  return user;
}
