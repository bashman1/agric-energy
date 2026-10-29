// Create/edit a Technology. Client-rendered: records created after the build
// have no prerendered page, so the editor reads ?slug= at runtime.
"use client";

import { Suspense } from "react";
import { getToken } from "@/lib/auth/token";
import AdminContentForm from "@/components/admin/AdminContentForm";
import AdminEditPage from "@/components/admin/AdminEditPage";
import { getTechnologyBySlug } from "@/lib/data/technologies";
import type { Technology } from "@/lib/types";

function Editor() {
  return (
    <AdminEditPage<Technology>
      module="technologies"
      listLabel="Technologies"
      itemLabel="Technology"
      load={(slug) => getTechnologyBySlug(slug, getToken())}
      titleOf={(x) => x.name}
    >
      {({ item, mode }) => (
        <AdminContentForm module="technologies" item={item} mode={mode} />
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
