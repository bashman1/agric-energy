// Themes API — GET list, POST create
import { NextRequest, NextResponse } from "next/server";
import { filterThemes, createTheme } from "@/lib/data/themes";
import { requireAdminSession } from "@/lib/auth/session";
import { validateRequired, sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminMode = searchParams.get("admin") === "true";
  const items = await filterThemes(
    { search: searchParams.get("search") ?? undefined, featured: searchParams.has("featured") ? searchParams.get("featured") === "true" : undefined },
    !adminMode
  );
  return NextResponse.json({ data: items, total: items.length });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const v = validateRequired(body, ["name", "summary"]);
    if (!v.valid) return NextResponse.json({ error: "Validation failed", errors: v.errors }, { status: 400 });
    const item = await createTheme({
      name: sanitizeString(body.name),
      icon: sanitizeString(body.icon),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      whyItMatters: sanitizeString(body.whyItMatters, 5000),
      relatedTechnologyIds: sanitizeStringArray(body.relatedTechnologyIds),
      relatedProjectIds: sanitizeStringArray(body.relatedProjectIds),
      relatedResourceIds: sanitizeStringArray(body.relatedResourceIds),
      featured: sanitizeBoolean(body.featured),
      published: sanitizeBoolean(body.published, true),
    }, session.token);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to create theme" }, { status: 500 });
  }
}
