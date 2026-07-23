// Create/edit a Opportunity. Client-rendered: records created after the build
// have no prerendered page, so the editor reads ?slug= at runtime.
"use client";

import { Suspense } from "react";
import AdminContentForm from "@/components/admin/AdminContentForm";
import AdminEditPage from "@/components/admin/AdminEditPage";
import { getOpportunityBySlug } from "@/lib/data/opportunities";
import type { Opportunity } from "@/lib/types";

function Editor() {
  return (
    <AdminEditPage<Opportunity>
      module="opportunities"
      listLabel="Opportunities"
      itemLabel="Opportunity"
      load={(slug) => getOpportunityBySlug(slug)}
      titleOf={(x) => x.title}
    >
      {({ item, mode }) => (
        <AdminContentForm module="opportunities" item={item} mode={mode} />
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
