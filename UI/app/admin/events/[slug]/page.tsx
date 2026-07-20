import { getEventBySlug } from "@/lib/data/events";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import AdminContentForm from "@/components/admin/AdminContentForm";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "new") return { title: "New Event" };
  const token = await getAuthToken();
  const event = await getEventBySlug(slug, token);
  return { title: event ? `Edit: ${event.title}` : "Event Not Found" };
}

export default async function AdminEventEditPage({ params }: Props) {
  const { slug } = await params;
  const token = await getAuthToken();

  if (slug === "new") {
    return (
      <div>
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
          <Link href="/admin/events" className="hover:text-primary-700">Events</Link>
          <span>/</span>
          <span className="text-gray-800 font-medium">New Event</span>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Event</h1>
        <AdminContentForm module="events" item={{}} mode="new" />
      </div>
    );
  }

  const event = await getEventBySlug(slug, token);
  if (!event) notFound();

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link href="/admin/events" className="hover:text-primary-700">Events</Link>
        <span>/</span>
        <span className="text-gray-800 font-medium truncate max-w-xs">{event.title}</span>
      </nav>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Event</h1>
      <AdminContentForm module="events" item={{ ...event }} mode="edit" />
    </div>
  );
}
