// POST /api/content/[type] — admin create for the new content modules
// (posts, events, opportunities, policies). Forwards to Laravel with the token.
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { apiSend } from "@/lib/api/client";

const ALLOWED = ["posts", "events", "opportunities", "policies"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  try {
    const session = await requireAdminSession();
    const { type } = await params;
    if (!ALLOWED.includes(type)) {
      return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
    }
    const body = await req.json();
    const data = await apiSend("POST", type, body, { token: session.token });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
