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

// ── Roles & capability groups ────────────────────────────────────────────
// Mirrors api/app/Support/Roles.php. Laravel is the authority; these drive
// UI affordances only (which nav links and pages a role can see).
export const ROLE = {
  SUPER_ADMIN: "super-admin",
  PLATFORM_ADMIN: "platform-admin",
  KNOWLEDGE_MANAGER: "knowledge-manager",
  CONTENT_CONTRIBUTOR: "content-contributor",
  // Reviews without authoring. Kept out of every content group below on
  // purpose: holding no authoring rights is what makes the sign-off
  // independent of the people who write.
  REVIEWER: "reviewer",
  PARTNER: "partner",
  // Organisation-scoped. Held by partner accounts; confer nothing outside
  // the holder's own partner_id. Deliberately distinct slugs from the staff
  // roles above — see api/app/Support/Roles.php for why.
  PARTNER_ADMIN: "partner-admin",
  PARTNER_KNOWLEDGE_MANAGER: "partner-knowledge-manager",
  PARTNER_CONTENT_CONTRIBUTOR: "partner-content-contributor",
} as const;

/** Roles a partner administrator may grant inside their own organisation. */
export const PARTNER_TEAM_ROLES = [
  ROLE.PARTNER_ADMIN,
  ROLE.PARTNER_KNOWLEDGE_MANAGER,
  ROLE.PARTNER_CONTENT_CONTRIBUTOR,
] as const;

/** Roles that manage content: publish, review queue, taxonomy, analytics. */
export const CONTENT_MANAGER_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.PLATFORM_ADMIN,
  ROLE.KNOWLEDGE_MANAGER,
] as const;

/**
 * Roles that may work the review queue. Wider than CONTENT_MANAGER_ROLES,
 * which also carries authoring, taxonomy and analytics.
 */
export const REVIEWER_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.PLATFORM_ADMIN,
  ROLE.KNOWLEDGE_MANAGER,
  ROLE.REVIEWER,
] as const;

/** Roles that manage user accounts and role assignment. */
export const USER_MANAGER_ROLES = [ROLE.SUPER_ADMIN, ROLE.PLATFORM_ADMIN] as const;

/**
 * Roles that may enter /admin at all (content managers + contributors).
 * `partner` is intentionally excluded — partners use the /partner portal.
 */
export const STAFF_ROLES = [
  ROLE.SUPER_ADMIN,
  ROLE.PLATFORM_ADMIN,
  ROLE.KNOWLEDGE_MANAGER,
  ROLE.CONTENT_CONTRIBUTOR,
  ROLE.REVIEWER,
] as const;

/** Human-readable labels for display in the UI. */
export const ROLE_LABELS: Record<string, string> = {
  "super-admin": "Super Administrator",
  "platform-admin": "Platform Administrator",
  "knowledge-manager": "Knowledge Manager",
  "content-contributor": "Content Contributor",
  reviewer: "Reviewer",
  partner: "Partner",
  "partner-admin": "Organisation Admin",
  "partner-knowledge-manager": "Knowledge Manager",
  "partner-content-contributor": "Content Coordinator",
};

type StoredUser = Omit<SessionUser, "token" | "isLoggedIn">;

function hasAnyRole(
  user: Pick<StoredUser, "roles"> | null | undefined,
  roles: readonly string[]
): boolean {
  return !!user?.roles?.some((r) => roles.includes(r));
}

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

/** Staff = anyone with an admin-area role. */
export function isStaff(user: Pick<StoredUser, "roles"> | null): boolean {
  return hasAnyRole(user, STAFF_ROLES);
}

/** Can publish/review content, manage taxonomy, and view analytics/reports. */
export function canManageContent(user: Pick<StoredUser, "roles"> | null): boolean {
  return hasAnyRole(user, CONTENT_MANAGER_ROLES);
}

/**
 * Can work the review queue. A reviewer qualifies here and nowhere else: they
 * approve and return submissions but author nothing, so gating the queue on
 * canManageContent would have locked out the only role that exists to use it.
 */
export function canReview(user: Pick<StoredUser, "roles"> | null): boolean {
  return hasAnyRole(user, REVIEWER_ROLES);
}

/** Can manage user accounts and assign roles. */
export function canManageUsers(user: Pick<StoredUser, "roles"> | null): boolean {
  return hasAnyRole(user, USER_MANAGER_ROLES);
}

/**
 * Can manage their OWN organisation's team in the partner portal. Distinct
 * from canManageUsers(), which is platform-wide — an organisation admin has
 * no reach beyond accounts sharing its partner_id.
 */
export function canManagePartnerTeam(user: Pick<StoredUser, "roles"> | null): boolean {
  return !!user?.roles?.includes(ROLE.PARTNER_ADMIN);
}

/**
 * Can sign off their OWN organisation's submissions before the platform sees
 * them. Same holder as canManagePartnerTeam() today — the organisation's
 * administrator — but a separate predicate because the API gates the two
 * separately (`manage-partner-team` vs `org-review-queue`).
 */
export function canApproveOrgContent(user: Pick<StoredUser, "roles"> | null): boolean {
  return !!user?.roles?.includes(ROLE.PARTNER_ADMIN);
}

/** Super-admin only: system settings, audit trail, backups. */
export function isSuperAdmin(user: Pick<StoredUser, "roles"> | null): boolean {
  return !!user?.roles?.includes(ROLE.SUPER_ADMIN);
}
