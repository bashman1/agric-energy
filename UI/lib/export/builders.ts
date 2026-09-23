// ============================================================
// Detail Document builders — one per exportable record type.
// Each mirrors what its public detail page shows, including the
// related records resolved in the sidebar.
// ============================================================
import {
  DetailBlock,
  DetailDocument,
  fields,
  fmtDate,
  fmtMoney,
  fmtNumber,
  listBlock,
  pushBlock,
  textBlock,
} from "./document";
import { getProjectBySlug } from "@/lib/data/projects";
import { getTechnologyBySlug } from "@/lib/data/technologies";
import { getThemeBySlug } from "@/lib/data/themes";
import { getPartnerBySlug } from "@/lib/data/partners";
import { getResourceBySlug } from "@/lib/data/resources";
import { getEventBySlug } from "@/lib/data/events";
import { getOpportunityBySlug } from "@/lib/data/opportunities";
import { getPostBySlug } from "@/lib/data/posts";

/** Record types that expose a download menu on their detail page. */
export const EXPORTABLE_TYPES = [
  "projects",
  "technologies",
  "themes",
  "partners",
  "resources",
  "events",
  "opportunities",
  "news",
] as const;

export type ExportableType = (typeof EXPORTABLE_TYPES)[number];

export function isExportableType(value: string): value is ExportableType {
  return (EXPORTABLE_TYPES as readonly string[]).includes(value);
}

/** Resolve a list of slugs through a fetcher, dropping misses. */
async function resolveAll<T>(
  ids: string[] | undefined,
  fetcher: (slug: string) => Promise<T | null>
): Promise<T[]> {
  const items = await Promise.all((ids ?? []).map((id) => fetcher(id)));
  return items.flatMap((item) => (item ? [item] : []));
}

/** Drop blank/undefined entries from a tag list. */
function compact(values: (string | undefined | null)[]): string[] {
  return values.flatMap((v) => (v ? [v] : []));
}

/** Strip tags/entities so rich-text bodies read cleanly in PDF and Excel. */
function plainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Projects ───────────────────────────────────────────────

async function buildProject(slug: string, origin: string) {
  const project = await getProjectBySlug(slug);
  if (!project || !project.published) return null;

  const [technologies, partners, themes] = await Promise.all([
    resolveAll(project.technologyIds, getTechnologyBySlug),
    resolveAll(project.implementingPartnerIds, getPartnerBySlug),
    resolveAll(project.themeIds, getThemeBySlug),
  ]);

  const blocks: DetailBlock[] = [];
  pushBlock(blocks, {
    kind: "fields",
    heading: "Project Details",
    fields: fields([
      ["Status", project.status],
      ["Region", project.region],
      ["District", project.district],
      ["Location Note", project.locationNote],
      ["Value Chain", project.valueChain],
      ["Start Date", fmtDate(project.startDate)],
      ["End Date", project.endDate ? fmtDate(project.endDate) : "Ongoing"],
      ["Funding Partner", project.fundingPartner],
      ["Budget", fmtMoney(project.budget, project.budgetCurrency)],
      ["Beneficiaries Reached", fmtNumber(project.beneficiaryCount)],
      ["Coordinates", project.coordinates?.lat
        ? `${project.coordinates.lat}, ${project.coordinates.lng}`
        : ""],
      ["Project Website", project.externalUrl],
      ["Last Updated", fmtDate(project.updatedAt)],
    ]),
  });
  pushBlock(blocks, textBlock("Summary", project.summary));
  pushBlock(blocks, textBlock("Project Description", project.description));
  pushBlock(blocks, textBlock("Outcomes & Results", project.outcomes));
  pushBlock(blocks, listBlock("Beneficiary Groups", project.beneficiaries));
  pushBlock(blocks, {
    kind: "table",
    heading: "Technologies Used",
    columns: ["Technology", "Category"],
    rows: technologies.map((t) => [t.name, t.category]),
  });
  pushBlock(blocks, {
    kind: "table",
    heading: "Implementing Partners",
    columns: ["Partner", "Type"],
    rows: partners.map((p) => [p.name, p.type]),
  });
  pushBlock(blocks, listBlock("Themes", themes.map((t) => t.name)));

  return {
    entity: "Project",
    title: project.title,
    subtitle: project.summary,
    tags: compact([project.status, project.valueChain]),
    slug: project.slug,
    sourceUrl: `${origin}/projects/${project.slug}`,
    blocks,
  } satisfies DetailDocument;
}

// ─── Technologies ───────────────────────────────────────────

async function buildTechnology(slug: string, origin: string) {
  const tech = await getTechnologyBySlug(slug);
  if (!tech || !tech.published) return null;

  const [projects, resources] = await Promise.all([
    resolveAll(tech.relatedProjectIds, getProjectBySlug),
    resolveAll(tech.relatedResourceIds, getResourceBySlug),
  ]);

  const blocks: DetailBlock[] = [];
  pushBlock(blocks, {
    kind: "fields",
    heading: "Technology Details",
    fields: fields([
      ["Category", tech.category],
      ["Related Projects", String(projects.length)],
      ["Last Updated", fmtDate(tech.updatedAt)],
    ]),
  });
  pushBlock(blocks, textBlock("Summary", tech.summary));
  pushBlock(blocks, textBlock("Overview", tech.description));
  pushBlock(blocks, listBlock("Key Applications", tech.applications));
  pushBlock(blocks, listBlock("Benefits", tech.benefits));
  pushBlock(blocks, listBlock("Limitations", tech.limitations));
  pushBlock(blocks, listBlock("Operational Notes", tech.operationalNotes));
  pushBlock(blocks, listBlock("Maintenance Notes", tech.maintenanceNotes));
  pushBlock(blocks, {
    kind: "table",
    heading: "Related Projects",
    columns: ["Project", "Location", "Status"],
    rows: projects.map((p) => [
      p.title,
      p.district || p.region || "Uganda",
      p.status,
    ]),
  });
  pushBlock(blocks, {
    kind: "table",
    heading: "Related Resources",
    columns: ["Resource", "Type"],
    rows: resources.map((r) => [r.title, r.type]),
  });

  return {
    entity: "Technology",
    title: tech.name,
    subtitle: tech.summary,
    tags: compact([tech.category]),
    slug: tech.slug,
    sourceUrl: `${origin}/technologies/${tech.slug}`,
    blocks,
  } satisfies DetailDocument;
}

// ─── Themes ─────────────────────────────────────────────────

async function buildTheme(slug: string, origin: string) {
  const theme = await getThemeBySlug(slug);
  if (!theme || !theme.published) return null;

  const [projects, technologies, resources] = await Promise.all([
    resolveAll(theme.relatedProjectIds, getProjectBySlug),
    resolveAll(theme.relatedTechnologyIds, getTechnologyBySlug),
    resolveAll(theme.relatedResourceIds, getResourceBySlug),
  ]);

  const blocks: DetailBlock[] = [];
  pushBlock(blocks, {
    kind: "fields",
    heading: "Theme Details",
    fields: fields([
      ["Related Projects", String(projects.length)],
      ["Related Technologies", String(technologies.length)],
      ["Related Resources", String(resources.length)],
      ["Last Updated", fmtDate(theme.updatedAt)],
    ]),
  });
  pushBlock(blocks, textBlock("Summary", theme.summary));
  pushBlock(blocks, textBlock("About this Theme", theme.description));
  pushBlock(blocks, textBlock("Why It Matters", theme.whyItMatters));
  pushBlock(blocks, {
    kind: "table",
    heading: "Related Projects",
    columns: ["Project", "Location", "Status"],
    rows: projects.map((p) => [
      p.title,
      p.district || p.region || "Uganda",
      p.status,
    ]),
  });
  pushBlock(blocks, {
    kind: "table",
    heading: "Related Technologies",
    columns: ["Technology", "Category"],
    rows: technologies.map((t) => [t.name, t.category]),
  });
  pushBlock(blocks, {
    kind: "table",
    heading: "Resources on this Theme",
    columns: ["Resource", "Type"],
    rows: resources.map((r) => [r.title, r.type]),
  });

  return {
    entity: "Theme",
    title: theme.name,
    subtitle: theme.summary,
    slug: theme.slug,
    sourceUrl: `${origin}/themes/${theme.slug}`,
    blocks,
  } satisfies DetailDocument;
}

// ─── Partners ───────────────────────────────────────────────

async function buildPartner(slug: string, origin: string) {
  const partner = await getPartnerBySlug(slug);
  if (!partner || !partner.published) return null;

  const [projects, technologies, themes] = await Promise.all([
    resolveAll(partner.projectIds, getProjectBySlug),
    resolveAll(partner.technologyIds, getTechnologyBySlug),
    resolveAll(partner.themeIds, getThemeBySlug),
  ]);

  const blocks: DetailBlock[] = [];
  pushBlock(blocks, {
    kind: "fields",
    heading: "Organisation Profile",
    fields: fields([
      ["Type", partner.type],
      ["Category", partner.category],
      ["Acronym", partner.acronym],
      ["Year Established", partner.yearEstablished],
      ["Registration Number", partner.registrationNumber],
      ["Website", partner.website],
      ["Email", partner.email],
      ["Phone", partner.phone],
      ["Physical Address", partner.physicalAddress],
      ["Postal Address", partner.postalAddress],
      ["Employees", partner.employeesBand],
      ["Branches", partner.branchesBand],
      ["Beneficiaries", partner.beneficiariesBand],
      ["Annual Budget Range", partner.annualBudgetRange],
      ["Last Updated", fmtDate(partner.updatedAt)],
    ]),
  });
  pushBlock(blocks, {
    kind: "fields",
    heading: "Contact Person",
    fields: fields([
      ["Name", partner.contactName],
      ["Position", partner.contactPosition],
      ["Email", partner.contactEmail],
      ["Phone", partner.contactPhone],
    ]),
  });
  pushBlock(blocks, textBlock("Summary", partner.summary));
  pushBlock(blocks, textBlock("About", partner.description));
  pushBlock(blocks, textBlock("Mission", partner.mission));
  pushBlock(blocks, listBlock("Coverage Scope", partner.coverageScope));
  pushBlock(blocks, listBlock("Countries", partner.countries));
  pushBlock(blocks, listBlock("Regions", partner.regions));
  pushBlock(blocks, listBlock("District Coverage", partner.districtCoverage));
  pushBlock(blocks, listBlock("Sectors", partner.sectors));
  pushBlock(blocks, listBlock("Value Chains", partner.valueChains));
  pushBlock(blocks, listBlock("Areas of Expertise", partner.expertise));
  pushBlock(blocks, {
    kind: "table",
    heading: "Projects",
    columns: ["Project", "Location", "Status"],
    rows: projects.map((p) => [
      p.title,
      p.district || p.region || "Uganda",
      p.status,
    ]),
  });
  pushBlock(blocks, listBlock("Technologies", technologies.map((t) => t.name)));
  pushBlock(blocks, listBlock("Themes", themes.map((t) => t.name)));

  return {
    entity: "Partner",
    title: partner.name,
    subtitle: partner.summary,
    tags: compact([partner.type, partner.category]),
    slug: partner.slug,
    sourceUrl: `${origin}/partners/${partner.slug}`,
    blocks,
  } satisfies DetailDocument;
}

// ─── Resources ──────────────────────────────────────────────

async function buildResource(slug: string, origin: string) {
  const resource = await getResourceBySlug(slug);
  if (!resource || !resource.published) return null;

  const [themes, technologies] = await Promise.all([
    resolveAll(resource.themeIds, getThemeBySlug),
    resolveAll(resource.technologyIds, getTechnologyBySlug),
  ]);

  const blocks: DetailBlock[] = [];
  pushBlock(blocks, {
    kind: "fields",
    heading: "Resource Details",
    fields: fields([
      ["Type", resource.type],
      ["Publication Date", fmtDate(resource.publicationDate)],
      ["File", resource.fileUrl],
      ["External Link", resource.externalUrl],
      ["Last Updated", fmtDate(resource.updatedAt)],
    ]),
  });
  pushBlock(blocks, textBlock("Summary", resource.summary));
  pushBlock(blocks, textBlock("Description", resource.description));
  pushBlock(blocks, listBlock("Themes", themes.map((t) => t.name)));
  pushBlock(blocks, listBlock("Technologies", technologies.map((t) => t.name)));

  return {
    entity: "Resource",
    title: resource.title,
    subtitle: resource.summary,
    tags: compact([resource.type]),
    slug: resource.slug,
    sourceUrl: `${origin}/resources/${resource.slug}`,
    blocks,
  } satisfies DetailDocument;
}

// ─── Events ─────────────────────────────────────────────────

async function buildEvent(slug: string, origin: string) {
  const event = await getEventBySlug(slug);
  if (!event || !event.published) return null;

  const blocks: DetailBlock[] = [];
  pushBlock(blocks, {
    kind: "fields",
    heading: "Event Details",
    fields: fields([
      ["Type", event.type],
      ["Starts", fmtDate(event.startsAt)],
      ["Ends", fmtDate(event.endsAt)],
      ["Format", event.isOnline ? "Online" : "In person"],
      ["Location", event.location],
      ["Registration", event.registrationUrl],
      ["Last Updated", fmtDate(event.updatedAt)],
    ]),
  });
  pushBlock(blocks, textBlock("Summary", event.summary));
  pushBlock(blocks, textBlock("Description", plainText(event.description)));

  return {
    entity: "Event",
    title: event.title,
    subtitle: event.summary,
    tags: compact([event.type, event.isOnline ? "Online" : "In person"]),
    slug: event.slug,
    sourceUrl: `${origin}/events/${event.slug}`,
    blocks,
  } satisfies DetailDocument;
}

// ─── Opportunities ──────────────────────────────────────────

async function buildOpportunity(slug: string, origin: string) {
  const opp = await getOpportunityBySlug(slug);
  if (!opp || !opp.published) return null;

  const blocks: DetailBlock[] = [];
  pushBlock(blocks, {
    kind: "fields",
    heading: "Opportunity Details",
    fields: fields([
      ["Type", opp.opportunityType],
      // A vacancy names its employer; every other type names its funder.
      ["Organization", opp.organization],
      ["Funder", opp.funder],
      ["Amount", [opp.currency, opp.amount].filter(Boolean).join(" ")],
      ["Minimum Education", opp.minimumEducation],
      ["Experience", opp.experience],
      ["Sector", opp.sector],
      ["Value Chain", opp.valueChain],
      ["Region", opp.region],
      ["Deadline", fmtDate(opp.deadline)],
      ["Application Link", opp.externalUrl],
      ["Document", opp.documentUrl],
      ["Last Updated", fmtDate(opp.updatedAt)],
    ]),
  });
  pushBlock(blocks, textBlock("Summary", opp.summary));
  pushBlock(blocks, textBlock("Description", plainText(opp.description)));
  pushBlock(
    blocks,
    textBlock("Duties And Responsibilities", plainText(opp.dutiesResponsibilities))
  );
  pushBlock(blocks, textBlock("Competences", plainText(opp.competences)));
  pushBlock(blocks, textBlock("Eligibility", plainText(opp.eligibility)));

  return {
    entity: "Opportunity",
    title: opp.title,
    subtitle: opp.summary,
    tags: compact([opp.opportunityType, opp.sector]),
    slug: opp.slug,
    sourceUrl: `${origin}/opportunities/${opp.slug}`,
    blocks,
  } satisfies DetailDocument;
}

// ─── News / posts ───────────────────────────────────────────

async function buildPost(slug: string, origin: string) {
  const post = await getPostBySlug(slug);
  if (!post || !post.published) return null;

  const blocks: DetailBlock[] = [];
  pushBlock(blocks, {
    kind: "fields",
    heading: "Article Details",
    fields: fields([
      ["Category", post.category],
      ["Published", fmtDate(post.publishedAt)],
      ["Last Updated", fmtDate(post.updatedAt)],
    ]),
  });
  pushBlock(blocks, textBlock("Excerpt", post.excerpt));
  pushBlock(blocks, textBlock("Article", plainText(post.body)));

  return {
    entity: "News Article",
    title: post.title,
    subtitle: post.excerpt,
    tags: compact([post.category]),
    slug: post.slug,
    sourceUrl: `${origin}/news/${post.slug}`,
    blocks,
  } satisfies DetailDocument;
}

const BUILDERS: Record<
  ExportableType,
  (slug: string, origin: string) => Promise<DetailDocument | null>
> = {
  projects: buildProject,
  technologies: buildTechnology,
  themes: buildTheme,
  partners: buildPartner,
  resources: buildResource,
  events: buildEvent,
  opportunities: buildOpportunity,
  news: buildPost,
};

export function buildDetailDocument(
  type: ExportableType,
  slug: string,
  origin: string
): Promise<DetailDocument | null> {
  return BUILDERS[type](slug, origin);
}
