// ============================================================
// Submissions Data Service — backed by the Laravel REST API.
// Public create (contact form) + admin inbox management.
// ============================================================
import { Submission } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getAllSubmissions(token?: string): Promise<Submission[]> {
  const items = await apiGet<Submission[]>("submissions", [], { token });
  return items.sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export async function getSubmissionById(
  id: string,
  token?: string
): Promise<Submission | null> {
  return apiGet<Submission | null>(`submissions/${id}`, null, { token });
}

export async function createSubmission(
  data: Omit<
    Submission,
    "id" | "status" | "emailStatus" | "adminNotes" | "submittedAt" | "updatedAt"
  >
): Promise<Submission> {
  return (await apiSend<Submission>("POST", "submissions", data))!;
}

export async function updateSubmission(
  id: string,
  updates: Partial<Pick<Submission, "status" | "emailStatus" | "adminNotes">>,
  token?: string
): Promise<Submission | null> {
  return apiSend<Submission>("PATCH", `submissions/${id}`, updates, { token });
}

export async function deleteSubmission(
  id: string,
  token?: string
): Promise<boolean> {
  try {
    await apiSend("DELETE", `submissions/${id}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}

export async function getSubmissionStats(token?: string) {
  const all = await getAllSubmissions(token);
  return {
    total: all.length,
    new: all.filter((s) => s.status === "new").length,
    read: all.filter((s) => s.status === "read").length,
    responded: all.filter((s) => s.status === "responded").length,
    archived: all.filter((s) => s.status === "archived").length,
    emailSent: all.filter((s) => s.emailStatus === "sent").length,
    emailFailed: all.filter((s) => s.emailStatus === "failed").length,
  };
}
