// ============================================================
// Projects API Route — GET (list/filter), POST (create)
// /api/projects
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { filterProjects, createProject } from "@/lib/data/projects";
import { validateRequired, sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";
import { requireAdminSession } from "@/lib/auth/session";
import { ProjectFilters } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminMode = searchParams.get("admin") === "true";

    const filters: ProjectFilters = {
      search: searchParams.get("search") ?? undefined,
      region: searchParams.get("region") ?? undefined,
      district: searchParams.get("district") ?? undefined,
      technologyId: searchParams.get("technologyId") ?? undefined,
      themeId: searchParams.get("themeId") ?? undefined,
      valueChain: searchParams.get("valueChain") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      partnerId: searchParams.get("partnerId") ?? undefined,
      featured: searchParams.has("featured") ? searchParams.get("featured") === "true" : undefined,
    };

    const projects = await filterProjects(filters, !adminMode);
    return NextResponse.json({ data: projects, total: projects.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch projects" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();

    const validation = validateRequired(body, ["title", "summary"]);
    if (!validation.valid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    const project = await createProject({
      title: sanitizeString(body.title),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      region: sanitizeString(body.region),
      district: sanitizeString(body.district),
      locationNote: sanitizeString(body.locationNote),
      coordinates: body.coordinates ?? { lat: 1.373, lng: 32.290 },
      implementingPartnerIds: sanitizeStringArray(body.implementingPartnerIds),
      fundingPartner: sanitizeString(body.fundingPartner),
      technologyIds: sanitizeStringArray(body.technologyIds),
      themeIds: sanitizeStringArray(body.themeIds),
      valueChain: sanitizeString(body.valueChain),
      beneficiaries: sanitizeStringArray(body.beneficiaries),
      status: sanitizeString(body.status) || "Active",
      startDate: sanitizeString(body.startDate),
      endDate: sanitizeString(body.endDate),
      outcomes: sanitizeString(body.outcomes, 5000),
      featuredImage: sanitizeString(body.featuredImage),
      gallery: sanitizeStringArray(body.gallery),
      externalUrl: sanitizeString(body.externalUrl),
      featured: sanitizeBoolean(body.featured),
      published: sanitizeBoolean(body.published, true),
    }, session.token);

    return NextResponse.json({ data: project }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }
}
