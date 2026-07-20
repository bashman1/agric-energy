// ============================================================
// Policies API Route — GET (list), POST (create)
// /api/policies
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getAllPolicies, getPublishedPolicies, createPolicy } from "@/lib/data/policies";
import { validateRequired, sanitizeString, sanitizeBoolean } from "@/lib/utils/validation";
import { requireAdminSession, getAuthToken } from "@/lib/auth/session";

/** Omit blank dates entirely — the API rejects empty date strings. */
function sanitizeDate(val: unknown): string | undefined {
  return sanitizeString(val, 40) || undefined;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminMode = searchParams.get("admin") === "true";

    const policies = adminMode
      ? await getAllPolicies(await getAuthToken())
      : await getPublishedPolicies();

    return NextResponse.json({ data: policies, total: policies.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch policies" }, { status: 500 });
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

    const policy = await createPolicy({
      title: sanitizeString(body.title),
      category: sanitizeString(body.category),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      documentUrl: sanitizeString(body.documentUrl),
      publicationDate: sanitizeDate(body.publicationDate),
      featured: sanitizeBoolean(body.featured),
      published: sanitizeBoolean(body.published, true),
    }, session.token);

    return NextResponse.json({ data: policy }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create policy" }, { status: 500 });
  }
}
