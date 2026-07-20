// PUT /api/users/[id]/roles — replace a user's roles
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { setUserRoles } from "@/lib/data/admin";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdminSession();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    if (!Array.isArray(body?.roles)) {
      return NextResponse.json({ error: "roles must be an array" }, { status: 400 });
    }
    const data = await setUserRoles(Number(id), body.roles, session.token);
    return NextResponse.json({ data });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to update roles" }, { status: 500 });
  }
}
