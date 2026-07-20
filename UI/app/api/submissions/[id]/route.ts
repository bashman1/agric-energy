import { NextRequest, NextResponse } from "next/server";
import { getSubmissionById, updateSubmission, deleteSubmission } from "@/lib/data/submissions";
import { SubmissionStatus, EmailDeliveryStatus } from "@/lib/types";

interface Params { params: Promise<{ id: string }> }

// GET /api/submissions/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const submission = await getSubmissionById(id);
  if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(submission);
}

// PATCH /api/submissions/[id] — update status / adminNotes / emailStatus
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const { status, adminNotes, emailStatus } = body as {
    status?: SubmissionStatus;
    adminNotes?: string;
    emailStatus?: EmailDeliveryStatus;
  };
  const updated = await updateSubmission(id, {
    ...(status !== undefined && { status }),
    ...(adminNotes !== undefined && { adminNotes }),
    ...(emailStatus !== undefined && { emailStatus }),
  });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// DELETE /api/submissions/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteSubmission(id);
  if (!deleted) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ message: "Deleted" });
}
