"use client";

import AdminDataPage from "@/components/admin/AdminDataPage";
import { getReviewQueue } from "@/lib/data/admin";
import ReviewQueueClient from "./ReviewQueueClient";

export default function AdminReviewPage() {
  return (
    <AdminDataPage title="Review Queue" load={() => getReviewQueue()}>
      {(items, reload) => {
      return <ReviewQueueClient items={items} onChanged={reload} />;
      }}
    </AdminDataPage>
  );
}
