import { getPostBySlug } from "@/lib/data/posts";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AdminContentForm from "@/components/admin/AdminContentForm";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "new") return { title: "New Post" };
  const token = await getAuthToken();
  const post = await getPostBySlug(slug, token);
  return { title: post ? `Edit: ${post.title}` : "Post Not Found" };
}

export default async function AdminPostEditPage({ params }: Props) {
  const { slug } = await params;
  const token = await getAuthToken();

  if (slug === "new") {
    return (
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/posts" className="hover:text-primary-700">Posts</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">New Post</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Post</h1>
        <AdminContentForm module="posts" item={{ category: "news" }} mode="new" />
      </div>
    );
  }

  const post = await getPostBySlug(slug, token);
  if (!post) notFound();

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/admin/posts" className="hover:text-primary-700">Posts</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{post.title}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Post</h1>
      <AdminContentForm module="posts" item={{ ...post }} mode="edit" />
    </div>
  );
}
