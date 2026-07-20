// Resources API — GET list, POST create
import { NextRequest, NextResponse } from "next/server";
import { filterResources, createResource } from "@/lib/data/resources";
import { requireAdminSession } from "@/lib/auth/session";
import { validateRequired, sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";
import { ResourceFilters } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminMode = searchParams.get("admin") === "true";
  const filters: ResourceFilters = {
    search: searchParams.get("search") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    themeId: searchParams.get("themeId") ?? undefined,
    technologyId: searchParams.get("technologyId") ?? undefined,
    featured: searchParams.has("featured") ? searchParams.get("featured") === "true" : undefined,
  };
  const items = await filterResources(filters, !adminMode);
  return NextResponse.json({ data: items, total: items.length });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const v = validateRequired(body, ["title", "summary", "type"]);
    if (!v.valid) return NextResponse.json({ error: "Validation failed", errors: v.errors }, { status: 400 });
    const item = await createResource({
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
      published: sanitizeBoolean(body.published, true),
    }, session.token);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to create resource" }, { status: 500 });
  }
}
