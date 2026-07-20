// Projects API — GET, PUT, DELETE by slug
// /api/projects/[slug]
import { NextRequest, NextResponse } from "next/server";
import { getProjectBySlug, updateProject, deleteProject } from "@/lib/data/projects";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: project });
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { slug } = await params;
    const body = await req.json();
    const updated = await updateProject(slug, {
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
      status: sanitizeString(body.status),
      startDate: sanitizeString(body.startDate),
      endDate: sanitizeString(body.endDate),
      outcomes: sanitizeString(body.outcomes, 5000),
      featuredImage: sanitizeString(body.featuredImage),
      gallery: sanitizeStringArray(body.gallery),
      externalUrl: sanitizeString(body.externalUrl),
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
    const ok = await deleteProject(slug, session.token);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
