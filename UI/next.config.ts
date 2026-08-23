import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Conditional static export. When STATIC_EXPORT=1 (set by
 * deploy/scripts/build-static.sh), `next build` prerenders every page
 * against the Laravel API and emits a self-contained site into UI/out,
 * copied to api/public/static and served by Laravel.
 *
 * Without that env var, `next build` produces a runnable server build
 * (.next) for `next start` behind nginx (the deploy/systemd path).
 *
 * Public pages are rendered once at build time, so content approved in the
 * admin panel appears only after the next rebuild — see lib/api/client.ts.
 * Admin and partner panels still work because their pages are static shells
 * whose client-side JS calls /api/v1 at runtime.
 *
 * next-intl's plugin is deliberately absent: the locale is resolved
 * client-side by components/i18n/IntlProvider.tsx.
 */
const nextConfig: NextConfig = {
  // Static HTML export into UI/out (then api/public/static) when
  // STATIC_EXPORT=1 is set (see deploy/scripts/build-static.sh). Left unset,
  // `next build` produces a runnable server build (.next) for `next start`
  // behind nginx (the deploy/systemd path).
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
