// ============================================================
// Events API Route — GET (list), POST (create)
// /api/events
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getAllEvents, getPublishedEvents, createEvent } from "@/lib/data/events";
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

    const events = adminMode
      ? await getAllEvents(await getAuthToken())
      : await getPublishedEvents();

    return NextResponse.json({ data: events, total: events.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 });
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

    const event = await createEvent({
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
      published: sanitizeBoolean(body.published, true),
    }, session.token);

    return NextResponse.json({ data: event }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 });
  }
}
