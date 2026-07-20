// Technologies — GET, PUT, DELETE by slug
// /api/technologies/[slug]
import { NextRequest, NextResponse } from "next/server";
import { getTechnologyBySlug, updateTechnology, deleteTechnology } from "@/lib/data/technologies";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const item = await getTechnologyBySlug(slug);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: item });
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { slug } = await params;
    const body = await req.json();
    const updated = await updateTechnology(slug, {
      name: sanitizeString(body.name),
      category: sanitizeString(body.category),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      applications: sanitizeStringArray(body.applications),
      benefits: sanitizeStringArray(body.benefits),
      limitations: sanitizeStringArray(body.limitations),
      operationalNotes: sanitizeStringArray(body.operationalNotes),
      maintenanceNotes: sanitizeStringArray(body.maintenanceNotes),
      relatedProjectIds: sanitizeStringArray(body.relatedProjectIds),
      relatedResourceIds: sanitizeStringArray(body.relatedResourceIds),
      featured: sanitizeBoolean(body.featured),
      published: sanitizeBoolean(body.published),
    }, session.token);
    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { slug } = await params;
    const ok = await deleteTechnology(slug, session.token);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
