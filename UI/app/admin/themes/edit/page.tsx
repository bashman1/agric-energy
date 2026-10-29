// Create/edit a Theme. Client-rendered: records created after the build
// have no prerendered page, so the editor reads ?slug= at runtime.
"use client";

import { Suspense } from "react";
import { getToken } from "@/lib/auth/token";
import AdminContentForm from "@/components/admin/AdminContentForm";
import AdminEditPage from "@/components/admin/AdminEditPage";
import { getThemeBySlug } from "@/lib/data/themes";
import type { Theme } from "@/lib/types";

function Editor() {
  return (
    <AdminEditPage<Theme>
      module="themes"
      listLabel="Themes"
      itemLabel="Theme"
      load={(slug) => getThemeBySlug(slug, getToken())}
      titleOf={(x) => x.name}
    >
      {({ item, mode }) => (
        <AdminContentForm module="themes" item={item} mode={mode} />
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
