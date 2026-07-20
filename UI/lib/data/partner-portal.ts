// ============================================================
// Partner portal data service — the signed-in partner's own
// submissions across content types.
// ============================================================
import { apiGet } from "@/lib/api/client";

export interface MyContentItem {
  type: string;
  slug: string;
  title: string;
  workflowStatus: string;
  published: boolean;
  reviewNotes: string | null;
  updatedAt: string | null;
}

export async function getMyContent(token?: string): Promise<MyContentItem[]> {
  return apiGet<MyContentItem[]>("my/content", [], { token });
}
