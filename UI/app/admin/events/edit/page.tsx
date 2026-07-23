// Create/edit a Event. Client-rendered: records created after the build
// have no prerendered page, so the editor reads ?slug= at runtime.
"use client";

import { Suspense } from "react";
import AdminContentForm from "@/components/admin/AdminContentForm";
import AdminEditPage from "@/components/admin/AdminEditPage";
import { getEventBySlug } from "@/lib/data/events";
import type { Event } from "@/lib/types";

function Editor() {
  return (
    <AdminEditPage<Event>
      module="events"
      listLabel="Events"
      itemLabel="Event"
      load={(slug) => getEventBySlug(slug)}
      titleOf={(x) => x.title}
    >
      {({ item, mode }) => (
        <AdminContentForm module="events" item={item} mode={mode} />
      )}
    </AdminEditPage>
  );
}

// useSearchParams needs a Suspense boundary to prerender.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Editor />
    </Suspense>
  );
}
