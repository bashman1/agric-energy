// ============================================================
// Admin Data Service — review workflow + user management.
// Server-side helpers that call the Laravel API with the
// current admin's Sanctum token.
// ============================================================
import { apiGet, apiSend } from "@/lib/api/client";

export interface ReviewQueueItem {
  /**
   * What is waiting. A `submission` is a record that has never been public;
   * approving it publishes it. A `revision` is an edit queued behind a record
   * that is ALREADY live — approving applies the edit, rejecting discards it,
   * and either way the live version was never taken down.
   */
  kind: "submission" | "revision";
  /** Set only on revisions — the queued edit acts on this, not on the slug. */
  revisionId?: number;
  /** Set only on revisions: which fields the edit touches. */
  changedFields?: string[];
  type: string;
  slug: string;
  title: string;
  workflowStatus: string;
  author: string | null;
  submittedAt: string | null;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  status: string;
  organisation: string;
  phone: string;
  roles: string[];
  partnerId?: string | null;
  emailVerified: boolean;
  approvedAt: string | null;
  createdAt: string | null;
}

export interface AuditEntry {
  id: number;
  event: string;
  description: string;
  logName: string;
  subjectType: string;
  subjectId: number | null;
  causer: string | null;
  changes: Record<string, unknown>;
  at: string | null;
}

// ── Review workflow ─────────────────────────────────────────
export async function getReviewQueue(
  token?: string,
  type?: string
): Promise<ReviewQueueItem[]> {
  return apiGet<ReviewQueueItem[]>("review/queue", [], {
    params: { type },
    token,
  });
}

export async function approveContent(
  type: string,
  slug: string,
  token?: string,
  notes?: string
) {
  return apiSend("POST", `${type}/${slug}/approve`, { notes }, { token });
}

export async function rejectContent(
  type: string,
  slug: string,
  notes: string,
  token?: string
) {
  return apiSend("POST", `${type}/${slug}/reject`, { notes }, { token });
}

/** Apply a queued edit to the live record it was raised against. */
export async function approveRevision(id: number, token?: string, notes?: string) {
  return apiSend("POST", `revisions/${id}/approve`, { notes }, { token });
}

/** Discard a queued edit. The live record was never changed. */
export async function rejectRevision(id: number, notes: string, token?: string) {
  return apiSend("POST", `revisions/${id}/reject`, { notes }, { token });
}

/**
 * Any content record by type and slug, including unpublished ones.
 *
 * Generic on purpose: the review queue mixes nine content types and needs to
 * show whichever one a reviewer opened, without a per-type branch. `admin=true`
 * is what lifts the published-only filter; the API grants it to reviewers and
 * content managers and refuses everyone else.
 */
export async function getAdminRecord(
  type: string,
  slug: string,
  token?: string
): Promise<Record<string, unknown> | null> {
  return apiGet<Record<string, unknown> | null>(`${type}/${slug}`, null, {
    params: { admin: true },
    token,
  });
}

/**
 * One queued edit, field by field, as it would change the live record.
 *
 * The record's own page shows the PUBLISHED version — a revision leaves that
 * untouched until it is approved — so this is the only way to see what an edit
 * actually proposes.
 */
export interface RevisionDetail {
  id: number;
  kind: "revision";
  type: string;
  slug: string;
  title: string;
  author: string | null;
  submittedAt: string | null;
  changes: { field: string; before: unknown; after: unknown }[];
  relations: Record<string, unknown>;
}

export async function getRevision(
  id: number,
  token?: string
): Promise<RevisionDetail | null> {
  return apiGet<RevisionDetail | null>(`revisions/${id}`, null, { token });
}

/** Route a queue item to whichever pair of endpoints applies to it. */
export async function approveQueueItem(item: ReviewQueueItem, token?: string) {
  return item.kind === "revision" && item.revisionId
    ? approveRevision(item.revisionId, token)
    : approveContent(item.type, item.slug, token);
}

export async function rejectQueueItem(
  item: ReviewQueueItem,
  notes: string,
  token?: string
) {
  return item.kind === "revision" && item.revisionId
    ? rejectRevision(item.revisionId, notes, token)
    : rejectContent(item.type, item.slug, notes, token);
}

// ── User management ─────────────────────────────────────────
export async function getUsers(
  token?: string,
  filters?: { status?: string; role?: string }
): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>("users", [], { params: filters, token });
}

/** Fields the admin "New user" form posts to create an account. */
export interface NewUserInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  roles: string[];
  phone?: string;
  organisation?: string;
  /** Partner slug — links a partner account to its organisation. */
  partner?: string;
}

/**
 * Create an account directly. The API marks it approved and
 * email-verified, so the person can sign in straight away.
 */
export async function createUser(input: NewUserInput, token?: string) {
  return apiSend("POST", "users", input, { token });
}

/** Fields the admin "Edit user" form may change; all optional. */
export interface UpdateUserInput {
  name?: string;
  email?: string;
  phone?: string;
  organisation?: string;
  /** Partner slug; null unlinks the organisation, omitted keeps it. */
  partner?: string | null;
  roles?: string[];
  password?: string;
  password_confirmation?: string;
}

export async function updateUser(id: number, input: UpdateUserInput, token?: string) {
  return apiSend("PATCH", `users/${id}`, input, { token });
}

export async function approveUser(id: number, token?: string) {
  return apiSend("POST", `users/${id}/approve`, undefined, { token });
}

export async function suspendUser(id: number, token?: string) {
  return apiSend("POST", `users/${id}/suspend`, undefined, { token });
}

export async function setUserRoles(id: number, roles: string[], token?: string) {
  return apiSend("PUT", `users/${id}/roles`, { roles }, { token });
}

// ── Audit trail ─────────────────────────────────────────────
export async function getAuditLog(
  token?: string,
  filters?: { event?: string; subjectType?: string; limit?: number }
): Promise<AuditEntry[]> {
  return apiGet<AuditEntry[]>("audit", [], { params: filters, token });
}

// ── Partner team (organisation-scoped) ──────────────────────
// Distinct from the user endpoints above: those are platform-wide and need
// `manage-users`; these only ever touch accounts in the caller's own
// organisation, and the API takes partner_id from the session rather than
// anything sent from here.

export interface NewTeamMemberInput {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  roles: string[];
  phone?: string;
}

/** Everyone in the signed-in partner admin's organisation. */
export async function getPartnerTeam(token?: string): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>("partner-team", [], { token });
}

export async function createTeamMember(input: NewTeamMemberInput, token?: string) {
  return apiSend("POST", "partner-team", input, { token });
}

export async function setTeamMemberStatus(
  id: number,
  status: "approved" | "suspended",
  token?: string
) {
  return apiSend("PATCH", `partner-team/${id}/status`, { status }, { token });
}
