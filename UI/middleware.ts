// ============================================================
// Middleware
//  • Locale detection — ensures a `locale` cookie exists on every
//    request (cookie → Accept-Language → "en"). No URL prefix.
//  • Auth guard — protect /admin and /partner areas
//      /admin/*   → staff roles (super-admin, editor, reviewer)
//      /partner/* → any authenticated approved user (partners)
//    Redirects unauthenticated users to the relevant login page.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions } from "@/lib/auth/session";
import { SessionUser } from "@/lib/types";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  localeFromAcceptLanguage,
} from "@/lib/i18n";

const STAFF_ROLES = ["super-admin", "editor", "reviewer"];

/** Persist a resolved locale cookie on the response when none is set yet. */
function withLocaleCookie(req: NextRequest, res: NextResponse): NextResponse {
  const current = req.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(current)) return res;

  res.cookies.set(
    LOCALE_COOKIE,
    localeFromAcceptLanguage(req.headers.get("accept-language")),
    { path: "/", maxAge: LOCALE_COOKIE_MAX_AGE, sameSite: "lax" }
  );
  return res;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isAdminArea = pathname.startsWith("/admin") && pathname !== "/admin/login";
  const isPartnerArea =
    pathname.startsWith("/partner") &&
    !["/partner/login", "/partner/register"].includes(pathname);

  if (!isAdminArea && !isPartnerArea) {
    return withLocaleCookie(req, NextResponse.next());
  }

  const res = NextResponse.next();
  const session = await getIronSession<SessionUser>(req, res, sessionOptions);

  // Not logged in → bounce to the appropriate login.
  if (!session.isLoggedIn) {
    const loginPath = isAdminArea ? "/admin/login" : "/partner/login";
    const loginUrl = new URL(loginPath, req.url);
    loginUrl.searchParams.set("from", pathname);
    return withLocaleCookie(req, NextResponse.redirect(loginUrl));
  }

  // Admin area requires a staff role; partners get sent to their portal.
  if (isAdminArea) {
    const isStaff = session.roles?.some((r) => STAFF_ROLES.includes(r));
    if (!isStaff) {
      return withLocaleCookie(
        req,
        NextResponse.redirect(new URL("/partner", req.url))
      );
    }
  }

  return withLocaleCookie(req, res);
}

export const config = {
  // Auth-guarded areas plus every public page (for locale detection),
  // excluding Next internals, the API proxy routes and static files.
  matcher: [
    "/admin/:path*",
    "/partner/:path*",
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
