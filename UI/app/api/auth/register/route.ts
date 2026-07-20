// POST /api/auth/register — proxy partner self-registration to the Laravel API.
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message =
        json?.errors?.email?.[0] ??
        json?.message ??
        "Registration failed";
      return NextResponse.json(
        { error: message, errors: json?.errors },
        { status: res.status === 422 ? 422 : 400 }
      );
    }

    return NextResponse.json(
      { message: json.message, data: json.data },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
