// ============================================================
// Partner portal data service — the signed-in partner's own
// submissions and directory profile.
// ============================================================
import { apiGet, apiSend, apiSendWithMeta } from "@/lib/api/client";
import type { Partner } from "@/lib/types";

export interface MyContentItem {
  type: string;
  slug: string;
  title: string;
  workflowStatus: string;
  published: boolean;
  reviewNotes: string | null;
  /** Who in the organisation submitted it. */
  author: string | null;
  /** Whether this account is the one that created it. */
  isMine: boolean;
  /**
   * An edit waiting for review behind a record that is already live. The
   * dashboard has to surface this or a contributor who revised a published
   * project sees no trace of the change and assumes it was lost.
   */
  pendingEdit: { id: number; submittedAt: string | null } | null;
  updatedAt: string | null;
}

export async function getMyContent(token?: string): Promise<MyContentItem[]> {
  return apiGet<MyContentItem[]>("my/content", [], { token });
}

/** The directory profile this account registered, if it has one. */
export async function getMyPartner(token?: string): Promise<Partner | null> {
  return apiGet<Partner | null>("my/partner", null, { token });
}

/**
 * Save changes to it.
 *
 * Resolves to `pending` when the profile is already published: the API parks
 * the edit for review and leaves the live entry alone, answering 202 rather
 * than 200. Callers need to tell the two apart to say the right thing.
 */
export async function updateMyPartner(
  patch: Partial<Partner>
): Promise<{ status: "saved" | "pending"; message?: string }> {
  const { status, body } = await apiSendWithMeta<Partner>("PUT", "my/partner", patch);

  return status === 202
    ? { status: "pending", message: body.message as string | undefined }
    : { status: "saved" };
}

// ── Organisation-level sign-off ─────────────────────────────
// The stage before the platform review queue: an organisation admin vouches
// for a colleague's submission, and only then does NREP see it. Endorsing
// does NOT publish — the platform reviewer still decides that.

export interface OrgQueueItem {
  type: string;
  slug: string;
  title: string;
  summary: string | null;
  workflowStatus: string;
  author: string | null;
  /** True when the admin wrote it themselves, which they may not sign off. */
  isMine: boolean;
  submittedAt: string | null;
}

/** Submissions from the caller's own organisation awaiting their sign-off. */
export async function getOrgQueue(token?: string): Promise<OrgQueueItem[]> {
  return apiGet<OrgQueueItem[]>("review/org-queue", [], { token });
}

/** Endorse it: it moves into the platform review queue, still unpublished. */
/**
 * A colleague's submission in full, so it can be read before it is endorsed.
 *
 * Organisation-scoped by the API — never another organisation's record — and
 * read-only. The public detail page is no substitute: the record is not
 * published yet, which is the whole reason it is in this queue.
 */
export async function getOrgSubmission(
  type: string,
  slug: string,
  token?: string
): Promise<Record<string, unknown> | null> {
  return apiGet<Record<string, unknown> | null>(
    `my/content/${type}/${slug}`,
    null,
    { token }
  );
}

export async function endorseOrgItem(item: OrgQueueItem, token?: string) {
  return apiSend("POST", `${item.type}/${item.slug}/org-approve`, {}, { token });
}

/** Return it to its author with notes. It never reaches the platform. */
export async function returnOrgItem(item: OrgQueueItem, notes: string, token?: string) {
  return apiSend("POST", `${item.type}/${item.slug}/org-return`, { notes }, { token });
}
