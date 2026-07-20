// ============================================================
// Admin Data Service — review workflow + user management.
// Server-side helpers that call the Laravel API with the
// current admin's Sanctum token.
// ============================================================
import { apiGet, apiSend } from "@/lib/api/client";

export interface ReviewQueueItem {
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

// ── User management ─────────────────────────────────────────
export async function getUsers(
  token?: string,
  filters?: { status?: string; role?: string }
): Promise<AdminUser[]> {
  return apiGet<AdminUser[]>("users", [], { params: filters, token });
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
