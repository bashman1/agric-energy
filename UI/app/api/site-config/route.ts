// Site Config API — GET, PUT
import { NextRequest, NextResponse } from "next/server";
import { getSiteConfig, updateSiteConfig } from "@/lib/data/site-config";
import { requireAdminSession } from "@/lib/auth/session";

export async function GET() {
  const config = await getSiteConfig();
  return NextResponse.json({ data: config });
}

export async function PUT(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const updated = await updateSiteConfig(body, session.token);
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update site config" }, { status: 500 });
  }
}
