// Create/edit a Partner. Client-rendered: records created after the build
// have no prerendered page, so the editor reads ?slug= at runtime.
"use client";

import { Suspense } from "react";
import AdminPartnerForm from "@/components/admin/AdminPartnerForm";
import AdminEditPage from "@/components/admin/AdminEditPage";
import { getPartnerBySlug } from "@/lib/data/partners";
import { getAllTechnologies } from "@/lib/data/technologies";
import { getAllThemes } from "@/lib/data/themes";
import { useAsync } from "@/lib/hooks/useAsync";
import type { Partner } from "@/lib/types";

function Editor() {
  const { data: refs } = useAsync(
    async () => Promise.all([getAllTechnologies(), getAllThemes()]),
    []
  );
  const [technologies = [], themes = []] = refs ?? [];

  return (
    <AdminEditPage<Partner>
      module="partners"
      listLabel="Partners"
      itemLabel="Partner"
      load={(slug) => getPartnerBySlug(slug)}
      titleOf={(p) => p.name}
    >
      {({ item, mode }) => (
        <AdminPartnerForm
          partner={item}
          mode={mode}
          technologies={technologies}
          themes={themes}
        />
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
