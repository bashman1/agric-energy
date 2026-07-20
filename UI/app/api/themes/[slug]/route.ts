// Themes — GET, PUT, DELETE by slug
import { NextRequest, NextResponse } from "next/server";
import { getThemeBySlug, updateTheme, deleteTheme } from "@/lib/data/themes";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const item = await getThemeBySlug(slug);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: item });
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { slug } = await params;
    const body = await req.json();
    const updated = await updateTheme(slug, {
      name: sanitizeString(body.name),
      icon: sanitizeString(body.icon),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      whyItMatters: sanitizeString(body.whyItMatters, 5000),
      relatedTechnologyIds: sanitizeStringArray(body.relatedTechnologyIds),
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
    const ok = await deleteTheme(slug, session.token);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
