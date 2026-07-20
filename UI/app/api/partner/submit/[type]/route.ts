// POST /api/partner/submit/[type] — a signed-in partner submits new content
// (projects, technologies, resources, events, opportunities). The Laravel API
// forces partner submissions into the `pending` review state.
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { apiSend } from "@/lib/api/client";

const ALLOWED = [
  "projects",
  "technologies",
  "resources",
  "events",
  "opportunities",
];

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
    const created = await apiSend("POST", type, body, {
      token: session.token,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Submission failed" }, { status: 500 });
  }
}
