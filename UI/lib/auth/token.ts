// ============================================================
// Auth token store — browser-side replacement for iron-session.
//
// Under the static build there is no Node server to hold an encrypted
// session cookie, so the Sanctum token lives in the browser and is
// attached to /api/v1 calls by lib/api/client.ts.
//
// sessionStorage, not localStorage: the token dies with the tab, which
// keeps a shared machine from leaving an admin session logged in. Laravel
// remains the only authority — every guarded endpoint checks the token and
// the caller's role server-side (see api/routes/api.php + ContentPolicy).
//
// Deliberately NOT a "use client" module: it exports no components and
// every accessor is `typeof window` guarded, so lib/api/client.ts can
// import it during the build-time prerender pass without pulling the
// client boundary along.
// ============================================================
import { SessionUser } from "@/lib/types";

const TOKEN_KEY = "agri_energy_token";
export const USER_KEY = "agri_energy_user";

/** Roles that may enter /admin. Mirrors the old middleware's STAFF_ROLES. */
export const STAFF_ROLES = ["super-admin", "editor", "reviewer"] as const;

type StoredUser = Omit<SessionUser, "token" | "isLoggedIn">;

/** Subscribers re-render when the session changes (login, logout, 401). */
const listeners = new Set<() => void>();

function emit(): void {
  for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getToken(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.sessionStorage.getItem(TOKEN_KEY) ?? undefined;
}

export function getUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: StoredUser): void {
  window.sessionStorage.setItem(TOKEN_KEY, token);
  window.sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  emit();
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(TOKEN_KEY);
  window.sessionStorage.removeItem(USER_KEY);
  emit();
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

/** Staff = platform team (not partner contributors). */
export function isStaff(user: Pick<StoredUser, "roles"> | null): boolean {
  return !!user?.roles?.some((r) =>
    (STAFF_ROLES as readonly string[]).includes(r)
  );
}
