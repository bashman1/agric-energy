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

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/lib/auth/useSession";

type Area = "admin" | "partner";

export default function RouteGuard({
  area,
  children,
}: {
  area: Area;
  children: React.ReactNode;
}) {
  const { user, loading, isLoggedIn, isStaff } = useSession();
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

  return <>{children}</>;
}

/** Convenience wrapper — `user` is guaranteed non-null inside. */
export function useGuardedUser() {
  const { user } = useSession();
  return user;
}
