// ============================================================
// Auth Session — iron-session as transport for the Sanctum token
// The iron-session cookie now stores the Laravel API token + the
// authenticated user's roles, so admin/partner server components
// can make authorised API calls.
// ============================================================
import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { SessionUser } from "@/lib/types";

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "agri_energy_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
  },
};

export async function getSession(): Promise<IronSession<SessionUser>> {
  const cookieStore = await cookies();
  const session = await getIronSession<SessionUser>(cookieStore, sessionOptions);
  return session;
}

/** Ensure a logged-in session, returning it. Throws if unauthenticated. */
export async function requireAdminSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.token) {
    throw new Error("Unauthorized");
  }
  return session;
}

/** The Sanctum bearer token for the current session, or undefined. */
export async function getAuthToken(): Promise<string | undefined> {
  const session = await getSession();
  return session.isLoggedIn ? session.token : undefined;
}

/** True if the current session has any of the given roles. */
export async function sessionHasRole(...roles: string[]): Promise<boolean> {
  const session = await getSession();
  return !!session.roles?.some((r) => roles.includes(r));
}

/** Staff = platform team (not partner contributors). */
export function isStaff(user: Pick<SessionUser, "roles">): boolean {
  return !!user.roles?.some((r) =>
    ["super-admin", "editor", "reviewer"].includes(r)
  );
}
