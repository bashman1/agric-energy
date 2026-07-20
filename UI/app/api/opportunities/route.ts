// ============================================================
// Opportunities API Route — GET (list), POST (create)
// /api/opportunities
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getAllOpportunities, getPublishedOpportunities, createOpportunity } from "@/lib/data/opportunities";
import { validateRequired, sanitizeString, sanitizeBoolean } from "@/lib/utils/validation";
import { requireAdminSession, getAuthToken } from "@/lib/auth/session";

/** Dates must be a valid date or null — the API rejects empty strings. */
function sanitizeDate(val: unknown): string | null {
  return sanitizeString(val, 40) || null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminMode = searchParams.get("admin") === "true";

    const opportunities = adminMode
      ? await getAllOpportunities(await getAuthToken())
      : await getPublishedOpportunities();

    return NextResponse.json({ data: opportunities, total: opportunities.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch opportunities" }, { status: 500 });
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

    const opportunity = await createOpportunity({
      title: sanitizeString(body.title),
      opportunityType: sanitizeString(body.opportunityType) || "funding",
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
      published: sanitizeBoolean(body.published, true),
    }, session.token);

    return NextResponse.json({ data: opportunity }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
  }
}
