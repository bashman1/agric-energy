// ============================================================
// Bulk actions on admin list tables — delete / publish / unpublish
// several records of one content type in a single request.
//
// The API authorises every record in the batch on its own and returns
// which ones went through, so this deliberately does NOT collapse the
// result into a boolean: "12 published, 3 skipped because you submitted
// them yourself" is the answer an admin needs, and a thrown error or a
// bare `false` loses it.
// ============================================================
import { apiSend } from "@/lib/api/client";

/** Content types the bulk endpoint accepts — mirrors App\Support\ContentTypes. */
export type BulkContentType =
  | "projects"
  | "technologies"
  | "themes"
  | "partners"
  | "resources"
  | "events"
  | "opportunities"
  | "policies"
  | "posts";

export type BulkAction = "delete" | "publish" | "unpublish";

export interface BulkFailure {
  slug: string;
  /** A full sentence explaining the refusal, ready to show as-is. */
  reason: string;
}

export interface BulkResult {
  action: BulkAction;
  type: BulkContentType;
  succeeded: string[];
  failed: BulkFailure[];
}

/**
 * Apply `action` to every slug. Rejects only when the request itself fails
 * (network, auth, validation) — a record the caller may not touch comes
 * back in `failed`, not as an exception.
 */
export async function bulkAction(
  type: BulkContentType,
  action: BulkAction,
  slugs: string[],
  token?: string
): Promise<BulkResult> {
  const result = await apiSend<BulkResult>(
    "POST",
    `bulk/${type}`,
    { action, slugs },
    { token }
  );

  // apiSend unwraps `data`; a 200 always carries it, but a null would
  // otherwise read as "everything succeeded" further up.
  if (!result) {
    throw new Error("The server did not report what happened to these records.");
  }

  return result;
}
