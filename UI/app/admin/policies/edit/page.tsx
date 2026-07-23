// Create/edit a Policy. Client-rendered: records created after the build
// have no prerendered page, so the editor reads ?slug= at runtime.
"use client";

import { Suspense } from "react";
import AdminContentForm from "@/components/admin/AdminContentForm";
import AdminEditPage from "@/components/admin/AdminEditPage";
import { getPolicyBySlug } from "@/lib/data/policies";
import type { Policy } from "@/lib/types";

function Editor() {
  return (
    <AdminEditPage<Policy>
      module="policies"
      listLabel="Policies"
      itemLabel="Policy"
      load={(slug) => getPolicyBySlug(slug)}
      titleOf={(x) => x.title}
    >
      {({ item, mode }) => (
        <AdminContentForm module="policies" item={item} mode={mode} />
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
