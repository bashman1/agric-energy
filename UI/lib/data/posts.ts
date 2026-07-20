// ============================================================
// Posts (news / stories / announcements) — backed by the API
// ============================================================
import { Post } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getPublishedPosts(category?: string): Promise<Post[]> {
  return apiGet<Post[]>("posts", [], { params: { category } });
}

export async function getAllPosts(token?: string): Promise<Post[]> {
  return apiGet<Post[]>("posts", [], {
    params: { admin: token ? true : undefined },
    token,
  });
}

export async function getPostBySlug(
  slug: string,
  token?: string
): Promise<Post | null> {
  return apiGet<Post | null>(`posts/${slug}`, null, {
    params: { admin: token ? true : undefined },
    token,
  });
}

export async function getLatestPosts(limit = 3): Promise<Post[]> {
  return (await getPublishedPosts()).slice(0, limit);
}

export async function createPost(
  data: Partial<Post>,
  token?: string
): Promise<Post> {
  return (await apiSend<Post>("POST", "posts", data, { token }))!;
}

export async function updatePost(
  slug: string,
  data: Partial<Post>,
  token?: string
): Promise<Post | null> {
  return apiSend<Post>("PUT", `posts/${slug}`, data, { token });
}

export async function deletePost(slug: string, token?: string): Promise<boolean> {
  try {
    await apiSend("DELETE", `posts/${slug}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}
