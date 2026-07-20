// ============================================================
// Newsletter subscribers — backed by the Laravel REST API
// Public subscribe (double opt-in) + admin listing / CSV export.
// ============================================================
import { apiGet, apiSend } from "@/lib/api/client";

/** A newsletter subscriber as returned by NewsletterController::index. */
export interface Subscriber {
  id: string;
  email: string;
  name: string | null;
  /** pending | confirmed | unsubscribed */
  status: string;
  subscribedAt: string | null;
}

/** Admin: every subscriber, newest first. */
export async function getSubscribers(token?: string): Promise<Subscriber[]> {
  return apiGet<Subscriber[]>("newsletter/subscribers", [], { token });
}

/**
 * URL of the admin CSV export. Points at the Next proxy route (which
 * attaches the Sanctum token server-side), so it is safe in an <a href>.
 */
export function exportSubscribersUrl(): string {
  return "/api/newsletter/export";
}

/**
 * Public: request a subscription. The API replies 202 and emails a
 * confirmation link — the subscriber is not active until confirmed.
 */
export async function subscribe(
  email: string,
  name?: string
): Promise<{ message: string }> {
  return (await apiSend<{ message: string }>("POST", "newsletter/subscribe", {
    email,
    name,
  }))!;
}
