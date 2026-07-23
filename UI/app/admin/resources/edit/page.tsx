// Create/edit a Resource. Client-rendered: records created after the build
// have no prerendered page, so the editor reads ?slug= at runtime.
"use client";

import { Suspense } from "react";
import AdminContentForm from "@/components/admin/AdminContentForm";
import AdminEditPage from "@/components/admin/AdminEditPage";
import { getResourceBySlug } from "@/lib/data/resources";
import type { Resource } from "@/lib/types";

function Editor() {
  return (
    <AdminEditPage<Resource>
      module="resources"
      listLabel="Resources"
      itemLabel="Resource"
      load={(slug) => getResourceBySlug(slug)}
      titleOf={(x) => x.title}
    >
      {({ item, mode }) => (
        <AdminContentForm module="resources" item={item} mode={mode} />
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
