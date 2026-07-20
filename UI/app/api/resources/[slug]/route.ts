// Resources — GET, PUT, DELETE by slug
import { NextRequest, NextResponse } from "next/server";
import { getResourceBySlug, updateResource, deleteResource } from "@/lib/data/resources";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const item = await getResourceBySlug(slug);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: item });
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { slug } = await params;
    const body = await req.json();
    const updated = await updateResource(slug, {
      title: sanitizeString(body.title),
      type: sanitizeString(body.type),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      fileUrl: sanitizeString(body.fileUrl),
      externalUrl: sanitizeString(body.externalUrl),
      themeIds: sanitizeStringArray(body.themeIds),
      technologyIds: sanitizeStringArray(body.technologyIds),
      publicationDate: sanitizeString(body.publicationDate),
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
    const ok = await deleteResource(slug, session.token);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
