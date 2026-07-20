// Auth — Logout Route Handler
// POST /api/auth/logout → revokes the Sanctum token, then clears the session.
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST() {
  const session = await getSession();

  if (session.token) {
    // Best-effort token revocation on the backend.
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${session.token}`,
        },
      });
    } catch {
      // ignore network errors on logout
    }
  }

  session.destroy();
  return NextResponse.json({ success: true });
}
