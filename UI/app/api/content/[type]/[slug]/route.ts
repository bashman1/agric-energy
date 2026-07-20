// PUT/DELETE /api/content/[type]/[slug] — admin update/delete for the new
// content modules. Forwards to Laravel with the session token.
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";
import { apiSend } from "@/lib/api/client";

const ALLOWED = ["posts", "events", "opportunities", "policies"];

function guard(type: string) {
  if (!ALLOWED.includes(type)) {
    throw new Error("BadType");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> }
) {
  try {
    const session = await requireAdminSession();
    const { type, slug } = await params;
    guard(type);
    const body = await req.json();
    const data = await apiSend("PUT", `${type}/${slug}`, body, {
      token: session.token,
    });
    return NextResponse.json({ data });
  } catch (err) {
    return handle(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string; slug: string }> }
) {
  try {
    const session = await requireAdminSession();
    const { type, slug } = await params;
    guard(type);
    await apiSend("DELETE", `${type}/${slug}`, undefined, {
      token: session.token,
    });
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return handle(err);
  }
}

function handle(err: unknown) {
  if (err instanceof Error && err.message === "Unauthorized") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (err instanceof Error && err.message === "BadType") {
    return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  }
  return NextResponse.json({ error: "Request failed" }, { status: 500 });
}
