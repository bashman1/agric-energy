// Create/edit a Project. Client-rendered: records created after the build
// have no prerendered page, so the editor reads ?slug= at runtime.
"use client";

import { Suspense } from "react";
import { getToken } from "@/lib/auth/token";
import AdminProjectForm from "@/components/admin/AdminProjectForm";
import AdminEditPage from "@/components/admin/AdminEditPage";
import { getProjectBySlug } from "@/lib/data/projects";
import { getAllPartners } from "@/lib/data/partners";
import { getAllTechnologies } from "@/lib/data/technologies";
import { getAllThemes } from "@/lib/data/themes";
import { useAsync } from "@/lib/hooks/useAsync";
import type { Project } from "@/lib/types";

function Editor() {
  // Reference data for the form's dropdowns, loaded once alongside the
  // record itself rather than per-render.
  const { data: refs } = useAsync(
    async () =>
      Promise.all([getAllPartners(), getAllTechnologies(), getAllThemes()]),
    []
  );
  const [partners = [], technologies = [], themes = []] = refs ?? [];

  return (
    <AdminEditPage<Project>
      module="projects"
      listLabel="Projects"
      itemLabel="Project"
      load={(slug) => getProjectBySlug(slug, getToken())}
      titleOf={(p) => p.title}
    >
      {({ item, mode }) => (
        <AdminProjectForm
          project={item}
          mode={mode}
          partners={partners}
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
