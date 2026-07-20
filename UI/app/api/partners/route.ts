// Partners API — GET list, POST create
import { NextRequest, NextResponse } from "next/server";
import { filterPartners, createPartner } from "@/lib/data/partners";
import { requireAdminSession } from "@/lib/auth/session";
import { validateRequired, sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";
import { PartnerFilters } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const adminMode = searchParams.get("admin") === "true";
  const filters: PartnerFilters = {
    search: searchParams.get("search") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    region: searchParams.get("region") ?? undefined,
    featured: searchParams.has("featured") ? searchParams.get("featured") === "true" : undefined,
  };
  const items = await filterPartners(filters, !adminMode);
  return NextResponse.json({ data: items, total: items.length });
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();
    const v = validateRequired(body, ["name", "summary", "type"]);
    if (!v.valid) return NextResponse.json({ error: "Validation failed", errors: v.errors }, { status: 400 });
    const item = await createPartner({
      name: sanitizeString(body.name),
      type: sanitizeString(body.type),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      website: sanitizeString(body.website),
      email: sanitizeString(body.email),
      phone: sanitizeString(body.phone),
      logo: sanitizeString(body.logo),
      regions: sanitizeStringArray(body.regions),
      districtCoverage: sanitizeStringArray(body.districtCoverage),
      technologyIds: sanitizeStringArray(body.technologyIds),
      themeIds: sanitizeStringArray(body.themeIds),
      projectIds: sanitizeStringArray(body.projectIds),
      featured: sanitizeBoolean(body.featured),
      published: sanitizeBoolean(body.published, true),
    }, session.token);
    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to create partner" }, { status: 500 });
  }
}
