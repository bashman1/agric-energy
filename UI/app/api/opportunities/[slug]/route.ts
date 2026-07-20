// Opportunities API — GET, PUT, DELETE by slug
// /api/opportunities/[slug]
import { NextRequest, NextResponse } from "next/server";
import { getOpportunityBySlug, updateOpportunity, deleteOpportunity } from "@/lib/data/opportunities";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizeString, sanitizeBoolean } from "@/lib/utils/validation";

type Params = { params: Promise<{ slug: string }> };

/** Dates must be a valid date or null — the API rejects empty strings. */
function sanitizeDate(val: unknown): string | null {
  return sanitizeString(val, 40) || null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const opportunity = await getOpportunityBySlug(slug);
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: opportunity });
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { slug } = await params;
    const body = await req.json();
    const updated = await updateOpportunity(slug, {
      title: sanitizeString(body.title),
      opportunityType: sanitizeString(body.opportunityType),
      funder: sanitizeString(body.funder),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      amount: sanitizeString(body.amount),
      currency: sanitizeString(body.currency),
      sector: sanitizeString(body.sector),
      valueChain: sanitizeString(body.valueChain),
      region: sanitizeString(body.region),
      deadline: sanitizeDate(body.deadline),
      eligibility: sanitizeString(body.eligibility, 5000),
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
    const ok = await deleteOpportunity(slug, session.token);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
