// ============================================================
// Events Data Service — backed by the Laravel REST API
// ============================================================
import { Event } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getPublishedEvents(): Promise<Event[]> {
  return apiGet<Event[]>("events", []);
}

export async function getAllEvents(token?: string): Promise<Event[]> {
  return apiGet<Event[]>("events", [], {
    params: { admin: token ? true : undefined },
    token,
  });
}

export async function getEventBySlug(
  slug: string,
  token?: string
): Promise<Event | null> {
  return apiGet<Event | null>(`events/${slug}`, null, {
    params: { admin: token ? true : undefined },
    token,
  });
}

export async function getUpcomingEvents(limit = 3): Promise<Event[]> {
  const now = Date.now();
  const events = await getPublishedEvents();
  return events
    .filter((e) => (e.startsAt ? new Date(e.startsAt).getTime() >= now : true))
    .slice(0, limit);
}

export async function createEvent(
  data: Partial<Event>,
  token?: string
): Promise<Event> {
  return (await apiSend<Event>("POST", "events", data, { token }))!;
}

export async function updateEvent(
  slug: string,
  data: Partial<Event>,
  token?: string
): Promise<Event | null> {
  return apiSend<Event>("PUT", `events/${slug}`, data, { token });
}

export async function deleteEvent(slug: string, token?: string): Promise<boolean> {
  try {
    await apiSend("DELETE", `events/${slug}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}
