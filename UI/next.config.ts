import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Conditional static export. When STATIC_EXPORT=1 (set by
 * deploy/scripts/build-static.sh), `next build` emits a self-contained site
 * into UI/out, copied to api/public/static and served by Laravel/nginx.
 *
 * Without that env var, `next build` produces a runnable server build
 * (.next) for `next start` behind nginx (the deploy/systemd path).
 *
 * The export contains NO content — not even the list of published slugs.
 * Every page fetches /api/v1 from the browser at runtime, and each dynamic
 * route exports a single shell that reads its slug from the address (see
 * lib/routing/shell.ts). So a record approved after the build is served
 * immediately, and one artefact deploys to every environment showing that
 * environment's data. Enumerating real slugs here is what used to freeze
 * the site to whatever was in the builder's database — do not reintroduce
 * it.
 *
 * next-intl's plugin is deliberately absent: the locale is resolved
 * client-side by components/i18n/IntlProvider.tsx.
 */
const nextConfig: NextConfig = {
  // Static HTML export into UI/out (then api/public/static) when
  // STATIC_EXPORT=1 is set (see deploy/scripts/build-static.sh). Left unset,
  // `next build` produces a runnable server build (.next) for `next start`
  // behind nginx (the deploy/systemd path). Both serve live data.
  ...(process.env.STATIC_EXPORT ? { output: "export" as const } : {}),

  // Directory-style URLs (`/projects/` not `/projects`). Every existing link,
  // bookmark and indexed URL carries the trailing slash, and Next
  // 308-redirects to add it.
  trailingSlash: true,

  // Next otherwise walks up looking for a lockfile and can land on an
  // unrelated parent, which changes where the build output lands.
  outputFileTracingRoot: projectRoot,

  images: {
    // next/image optimisation needs `sharp`, which is not installed and
    // would add a native build step to a 2GB droplet for no real gain:
    // uploads are already modest and Laravel serves them off disk.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
