// ============================================================
// Projects Data Service — backed by the Laravel REST API
// Signatures are unchanged from the prototype; only the data
// source moved from JSON files to /api/v1/projects.
// ============================================================
import { Project, ProjectFilters } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

export async function getAllProjects(token?: string): Promise<Project[]> {
  // With a token + admin flag the API includes unpublished records.
  const projects = await apiGet<Project[]>(
    "projects",
    [],
    { params: { admin: token ? true : undefined }, token }
  );
  return projects.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export async function getPublishedProjects(): Promise<Project[]> {
  return apiGet<Project[]>("projects", []);
}

export async function getProjectBySlug(
  slug: string,
  token?: string
): Promise<Project | null> {
  return apiGet<Project | null>(
    `projects/${slug}`,
    null,
    { params: { admin: token ? true : undefined }, token }
  );
}

export async function filterProjects(
  filters: ProjectFilters,
  publishedOnly = true
): Promise<Project[]> {
  let projects = publishedOnly
    ? await getPublishedProjects()
    : await getAllProjects();

  if (filters.search) {
    const q = filters.search.toLowerCase();
    projects = projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        (p.locationNote?.toLowerCase().includes(q) ?? false)
    );
  }

  // Geography filters — simple string includes (case-insensitive)
  if (filters.region) {
    const r = filters.region.toLowerCase();
    projects = projects.filter(
      (p) =>
        p.region.toLowerCase().includes(r) ||
        p.region.toLowerCase() === "national"
    );
  }

  if (filters.district) {
    const d = filters.district.toLowerCase();
    projects = projects.filter(
      (p) =>
        p.district.toLowerCase().includes(d) ||
        (p.locationNote?.toLowerCase().includes(d) ?? false)
    );
  }

  if (filters.technologyId) {
    projects = projects.filter((p) =>
      p.technologyIds.includes(filters.technologyId!)
    );
  }
  if (filters.themeId) {
    projects = projects.filter((p) => p.themeIds.includes(filters.themeId!));
  }
  if (filters.valueChain) {
    projects = projects.filter(
      (p) => p.valueChain.toLowerCase() === filters.valueChain!.toLowerCase()
    );
  }
  if (filters.status) {
    projects = projects.filter(
      (p) => p.status.toLowerCase() === filters.status!.toLowerCase()
    );
  }
  if (filters.partnerId) {
    projects = projects.filter((p) =>
      p.implementingPartnerIds.includes(filters.partnerId!)
    );
  }
  if (filters.featured !== undefined) {
    projects = projects.filter((p) => p.featured === filters.featured);
  }

  return projects;
}

export async function createProject(
  data: Omit<Project, "id" | "slug" | "updatedAt">,
  token?: string
): Promise<Project> {
  return (await apiSend<Project>("POST", "projects", data, { token }))!;
}

export async function updateProject(
  slug: string,
  data: Partial<Project>,
  token?: string
): Promise<Project | null> {
  return apiSend<Project>("PUT", `projects/${slug}`, data, { token });
}

export async function deleteProject(
  slug: string,
  token?: string
): Promise<boolean> {
  try {
    await apiSend("DELETE", `projects/${slug}`, undefined, { token });
    return true;
  } catch {
    return false;
  }
}

export async function getFeaturedProjects(limit = 3): Promise<Project[]> {
  const projects = await getPublishedProjects();
  return projects.filter((p) => p.featured).slice(0, limit);
}

/** Projects grouped by region — used for map stats */
export async function getProjectsByRegion(): Promise<Record<string, Project[]>> {
  const projects = await getPublishedProjects();
  const byRegion: Record<string, Project[]> = {};
  for (const project of projects) {
    const r = project.region || "Unknown";
    if (!byRegion[r]) byRegion[r] = [];
    byRegion[r].push(project);
  }
  return byRegion;
}
