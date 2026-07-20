// ============================================================
// Auth — Login Route Handler
// POST /api/auth/login  → authenticates against the Laravel API,
// stores the returned Sanctum token + roles in the iron-session cookie.
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/types";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Accept either `email` or the legacy `username` field.
    const email = body.email ?? body.username;
    const password = body.password;

    const res = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok || !json.token) {
      // 422 = pending approval / bad credentials; surface the API message.
      const message =
        json?.errors?.email?.[0] ??
        json?.message ??
        "Invalid credentials";
      return NextResponse.json({ error: message }, { status: 401 });
    }

    const user = json.data as AuthUser;
    const session = await getSession();
    session.isLoggedIn = true;
    session.token = json.token as string;
    session.userId = user.id;
    session.name = user.name;
    session.email = user.email;
    session.username = user.email;
    session.roles = user.roles;
    session.status = user.status;
    await session.save();

    return NextResponse.json({ success: true, roles: user.roles });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
