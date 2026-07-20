// GET /api/newsletter/export — proxy the subscriber CSV download from the
// Laravel API, attaching the admin's Sanctum token (kept server-side).
import { NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function GET() {
  try {
    const session = await requireAdminSession();

    const res = await fetch(`${API_URL}/newsletter/export`, {
      headers: {
        Accept: "text/csv",
        Authorization: `Bearer ${session.token}`,
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Export failed" }, { status: res.status });
    }

    const body = await res.text();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="agri-energy-subscribers.csv"`,
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
