// Policies API — GET, PUT, DELETE by slug
// /api/policies/[slug]
import { NextRequest, NextResponse } from "next/server";
import { getPolicyBySlug, updatePolicy, deletePolicy } from "@/lib/data/policies";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizeString, sanitizeBoolean } from "@/lib/utils/validation";

type Params = { params: Promise<{ slug: string }> };

/** Omit blank dates entirely — the API rejects empty date strings. */
function sanitizeDate(val: unknown): string | undefined {
  return sanitizeString(val, 40) || undefined;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const policy = await getPolicyBySlug(slug);
  if (!policy) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: policy });
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { slug } = await params;
    const body = await req.json();
    const updated = await updatePolicy(slug, {
      title: sanitizeString(body.title),
      category: sanitizeString(body.category),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      documentUrl: sanitizeString(body.documentUrl),
      publicationDate: sanitizeDate(body.publicationDate),
      featured: sanitizeBoolean(body.featured),
      published: sanitizeBoolean(body.published),
    }, session.token);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { slug } = await params;
    const ok = await deletePolicy(slug, session.token);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
