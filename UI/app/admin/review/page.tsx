import type { Metadata } from "next";
import { getAuthToken } from "@/lib/auth/session";
import { getReviewQueue } from "@/lib/data/admin";
import ReviewQueueClient from "./ReviewQueueClient";

export const metadata: Metadata = { title: "Review Queue" };

export default async function AdminReviewPage() {
  const token = await getAuthToken();
  const items = await getReviewQueue(token);
  return <ReviewQueueClient items={items} />;
}
