// ============================================================
// generateStaticParams helpers for the static export.
//
// Every public detail route prerenders one page per PUBLISHED record,
// fetched from Laravel at build time. Consequences worth knowing:
//
//  • Content published after a build has no page until the next build.
//    Wire a rebuild into the publish flow (see deploy/README.md).
//  • Unpublished records are never exported, so drafts cannot leak into
//    the static bundle — the detail pages' own `published` checks are a
//    second line of defence, not the first.
// ============================================================
import { getPublishedEvents } from "./events";
import { getPublishedOpportunities } from "./opportunities";
import { getPublishedPartners } from "./partners";
import { getPublishedPosts } from "./posts";
import { getPublishedProjects } from "./projects";
import { getPublishedResources } from "./resources";
import { getPublishedTechnologies } from "./technologies";
import { getPublishedThemes } from "./themes";

type SlugParams = { slug: string };

/**
 * Map a published-record list to route params.
 *
 * Fails the build on an empty result. A static export against an
 * unreachable or empty API otherwise succeeds silently and ships a site
 * with zero detail pages — the single worst failure mode here, because it
 * looks like a successful deploy.
 */
async function slugsFrom(
  label: string,
  load: () => Promise<Array<{ slug: string }>>
): Promise<SlugParams[]> {
  const records = await load();

  if (records.length === 0) {
    throw new Error(
      `generateStaticParams: no published ${label} returned by the API. ` +
        `Check API_URL and that the database is seeded — building on would ` +
        `export a site with no ${label} pages.`
    );
  }

  return records
    .filter((r) => !!r.slug)
    .map((r) => ({ slug: r.slug }));
}

export const projectParams = () => slugsFrom("projects", getPublishedProjects);
export const technologyParams = () =>
  slugsFrom("technologies", getPublishedTechnologies);
export const themeParams = () => slugsFrom("themes", getPublishedThemes);
export const partnerParams = () => slugsFrom("partners", getPublishedPartners);
export const resourceParams = () =>
  slugsFrom("resources", getPublishedResources);
export const eventParams = () => slugsFrom("events", getPublishedEvents);
export const opportunityParams = () =>
  slugsFrom("opportunities", getPublishedOpportunities);
export const postParams = () => slugsFrom("posts", () => getPublishedPosts());
