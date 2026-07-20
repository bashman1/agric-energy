// Technologies API — GET list, POST create
// /api/technologies
import { NextRequest, NextResponse } from "next/server";
import { filterTechnologies, createTechnology } from "@/lib/data/technologies";
import { requireAdminSession } from "@/lib/auth/session";
import { validateRequired, sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";
import { TechnologyFilters } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminMode = searchParams.get("admin") === "true";
  const filters: TechnologyFilters = {
    search: searchParams.get("search") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    featured: searchParams.has("featured") ? searchParams.get("featured") === "true" : undefined,
  };
  const items = await filterTechnologies(filters, !adminMode);
  return NextResponse.json({ data: items, total: items.length });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const validation = validateRequired(body, ["name", "summary", "category"]);
    if (!validation.valid) return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });

    const item = await createTechnology({
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
      published: sanitizeBoolean(body.published, true),
    }, session.token);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to create technology" }, { status: 500 });
  }
}
