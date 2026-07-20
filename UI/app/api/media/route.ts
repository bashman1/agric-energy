// POST /api/media — proxy a multipart file upload to the Laravel API,
// attaching the caller's Sanctum token (kept server-side).
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth/session";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const form = await req.formData();

    const res = await fetch(`${API_URL}/media`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: form, // forward multipart form data as-is
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error ?? json?.message ?? "Upload failed" },
        { status: res.status }
      );
    }
    return NextResponse.json(json, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
