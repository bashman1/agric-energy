// Events API — GET, PUT, DELETE by slug
// /api/events/[slug]
import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug, updateEvent, deleteEvent } from "@/lib/data/events";
import { requireAdminSession } from "@/lib/auth/session";
import { sanitizeString, sanitizeBoolean } from "@/lib/utils/validation";

type Params = { params: Promise<{ slug: string }> };

/** Dates must be a valid date or null — the API rejects empty strings. */
function sanitizeDate(val: unknown): string | null {
  return sanitizeString(val, 40) || null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: event });
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdminSession();
    const { slug } = await params;
    const body = await req.json();
    const updated = await updateEvent(slug, {
      title: sanitizeString(body.title),
      type: sanitizeString(body.type),
      summary: sanitizeString(body.summary),
      description: sanitizeString(body.description, 10000),
      startsAt: sanitizeDate(body.startsAt),
      endsAt: sanitizeDate(body.endsAt),
      isOnline: sanitizeBoolean(body.isOnline),
      location: sanitizeString(body.location),
      registrationUrl: sanitizeString(body.registrationUrl),
      featuredImage: sanitizeString(body.featuredImage),
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
    const ok = await deleteEvent(slug, session.token);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
