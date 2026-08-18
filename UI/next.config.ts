import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Node server. `next build` emits `.next/`, and `next start` serves it
 * behind nginx (see deploy/nginx/*.conf and deploy/systemd/*.service).
 *
 * This used to be a static export installed into api/public/static. It
 * was replaced because the public site was frozen at build time: content
 * approved in the admin panel did not appear until someone re-ran the
 * build. Public pages now render per request against Laravel's /api/v1,
 * so an approval is live immediately — see lib/api/client.ts.
 *
 * next-intl's plugin is still deliberately absent: the locale is resolved
 * client-side by components/i18n/IntlProvider.tsx, and moving it to the
 * server would change how every page is cached for no user-visible gain.
 */
const nextConfig: NextConfig = {
  // Directory-style URLs (`/projects/` not `/projects`). Unchanged from
  // the export era on purpose — every existing link, bookmark and indexed
  // URL carries the trailing slash, and Next 308-redirects to add it.
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
