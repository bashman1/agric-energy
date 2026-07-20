// POST /api/review/[type]/[slug]/approve — approve & publish content
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { approveContent } from "@/lib/data/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> }
) {
  try {
    const session = await requireAdminSession();
    const { type, slug } = await params;
    const body = await req.json().catch(() => ({}));
    const data = await approveContent(type, slug, session.token, body?.notes);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to approve" }, { status: 500 });
  }
}
