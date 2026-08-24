// ============================================================
// Static-export shells for dynamic public routes.
//
// A static export has to enumerate every path at build time. Enumerating
// real slugs was the thing that froze the public site: a record approved
// after the build had no HTML file, so it 404'd until someone rebuilt, and
// the build itself needed a live API and a populated database — which meant
// the artefact you shipped to UAT carried whatever content the builder's
// laptop happened to have.
//
// It also bought nothing. Every detail page is a client component that
// fetches by slug at runtime, so the prerendered HTML never contained the
// record — only the chrome and a loading state. Enumerating the slugs
// produced hundreds of byte-identical files.
//
// So each dynamic route exports ONE shell instead, and the server hands that
// shell to any path under the collection (see StaticSiteController). The
// shell reads the real slug out of the URL and fetches it — see
// useRouteSlug. The build no longer touches a database, so one artefact
// deploys to every environment and always shows that environment's live,
// approved content.
// ============================================================

/**
 * The single slug each dynamic route exports.
 *
 * Leading underscore so it cannot collide with a real record: slugs are
 * generated with Str::slug(), which never emits one.
 */
export const SHELL_SLUG = "_entry";

/**
 * `generateStaticParams` for a `[slug]` route. Deliberately synchronous and
 * data-free — nothing here should ever need the API.
 */
export function shellSlugParams(): { slug: string }[] {
  return [{ slug: SHELL_SLUG }];
}
