// ============================================================
// Newsletter subscribe — POST /api/newsletter/subscribe
// Public (no session): forwards a signup to the API, which emails a
// double opt-in confirmation link. Rate-limited server-side.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { subscribe } from "@/lib/data/newsletter";
import { validateRequired, sanitizeString } from "@/lib/utils/validation";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validation = validateRequired(body, ["email"]);
    if (!validation.valid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    const email = sanitizeString(body.email, 255).toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Validation failed", errors: { email: "Enter a valid email address" } },
        { status: 400 }
      );
    }

    const result = await subscribe(email, sanitizeString(body.name, 255) || undefined);
    return NextResponse.json({ data: result }, { status: 202 });
  } catch {
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}
