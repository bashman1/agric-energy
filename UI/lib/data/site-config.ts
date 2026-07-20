// ============================================================
// Site Config Data Service — backed by the Laravel REST API
// ============================================================
import { SiteConfig } from "@/lib/types";
import { apiGet, apiSend } from "@/lib/api/client";

const DEFAULT_CONFIG: SiteConfig = {
  hero: {
    title: "Uganda's National Agri-Energy Knowledge Platform",
    subtitle:
      "Explore agri-energy projects, technologies, partners, and resources from across Uganda.",
    ctaLabel: "Explore Projects",
    ctaUrl: "/projects",
    backgroundImage: "",
  },
  stats: {
    projects: 0,
    technologies: 0,
    themes: 0,
    partners: 0,
    resources: 0,
    districts: 0,
  },
  featuredProjectIds: [],
  featuredTechnologyIds: [],
  featuredThemeIds: [],
  featuredPartnerIds: [],
  featuredResourceIds: [],
  contactEmail: "agrienergy@nrep.go.ug",
  contactPhone: "+256 414 123 456",
  aboutSummary:
    "The Agri-Energy Desk is Uganda's national digital platform for agri-energy knowledge, project visibility, stakeholder coordination, and evidence-based planning.",
};

export async function getSiteConfig(): Promise<SiteConfig> {
  const data = await apiGet<SiteConfig | null>("site-config", null);
  return { ...DEFAULT_CONFIG, ...(data ?? {}) };
}

export async function updateSiteConfig(
  data: Partial<SiteConfig>,
  token?: string
): Promise<SiteConfig> {
  const updated = await apiSend<SiteConfig>("PUT", "site-config", data, {
    token,
  });
  return { ...DEFAULT_CONFIG, ...(updated ?? {}) };
}
