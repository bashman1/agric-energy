// ============================================================
// Newsletter subscribers — GET /api/newsletter/subscribers
// Admin only: forwards the session's Sanctum token to the API.
// ============================================================
import { NextResponse } from "next/server";
import { getSubscribers } from "@/lib/data/newsletter";
import { requireAdminSession } from "@/lib/auth/session";

export async function GET() {
  try {
    const session = await requireAdminSession();
    const subscribers = await getSubscribers(session.token);
    return NextResponse.json({ data: subscribers, total: subscribers.length });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to fetch subscribers" }, { status: 500 });
  }
}
