// POST /api/review/[type]/[slug]/reject — reject content with notes
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { rejectContent } from "@/lib/data/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> }
) {
  try {
    const session = await requireAdminSession();
    const { type, slug } = await params;
    const body = await req.json().catch(() => ({}));
    if (!body?.notes) {
      return NextResponse.json(
        { error: "Rejection notes are required" },
        { status: 400 }
      );
    }
    const data = await rejectContent(type, slug, body.notes, session.token);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to reject" }, { status: 500 });
  }
}
