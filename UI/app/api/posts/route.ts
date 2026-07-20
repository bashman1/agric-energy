// ============================================================
// Posts API Route — GET (list), POST (create)
// /api/posts
// ============================================================
import { NextRequest, NextResponse } from "next/server";
import { getAllPosts, getPublishedPosts, createPost } from "@/lib/data/posts";
import { validateRequired, sanitizeString, sanitizeStringArray, sanitizeBoolean } from "@/lib/utils/validation";
import { requireAdminSession, getAuthToken } from "@/lib/auth/session";

/** Dates must be a valid date or null — the API rejects empty strings. */
function sanitizeDate(val: unknown): string | null {
  return sanitizeString(val, 40) || null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const adminMode = searchParams.get("admin") === "true";

    const posts = adminMode
      ? await getAllPosts(await getAuthToken())
      : await getPublishedPosts(searchParams.get("category") ?? undefined);

    return NextResponse.json({ data: posts, total: posts.length });
  } catch {
    return NextResponse.json({ error: "Failed to fetch posts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminSession();
    const body = await req.json();

    const validation = validateRequired(body, ["title", "excerpt"]);
    if (!validation.valid) {
      return NextResponse.json({ error: "Validation failed", errors: validation.errors }, { status: 400 });
    }

    const post = await createPost({
      title: sanitizeString(body.title),
      category: sanitizeString(body.category) || "news",
      excerpt: sanitizeString(body.excerpt),
      body: sanitizeString(body.body, 50000),
      featuredImage: sanitizeString(body.featuredImage),
      gallery: sanitizeStringArray(body.gallery),
      publishedAt: sanitizeDate(body.publishedAt),
      featured: sanitizeBoolean(body.featured),
      published: sanitizeBoolean(body.published, true),
    }, session.token);

    return NextResponse.json({ data: post }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Failed to create post" }, { status: 500 });
  }
}
