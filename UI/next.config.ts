import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/**
 * Static export. `next build` emits `out/`, which
 * deploy/scripts/build-ui.sh installs into api/public/static for Laravel
 * to serve (see api/app/Http/Controllers/StaticSiteController.php).
 *
 * There is no Node server in production: auth, locale and all data
 * loading happen in the browser against Laravel's /api/v1 on the same
 * origin. next-intl's plugin is deliberately absent — it only exists to
 * wire up the server-side getRequestConfig, and the locale is resolved
 * client-side by components/i18n/IntlProvider.tsx.
 */
const nextConfig: NextConfig = {
  output: "export",

  // Assets live at public/static/_next, so their URLs must carry the
  // prefix. Files from UI/public are copied to Laravel's public root
  // instead (see build-ui.sh), so /logo.png still resolves.
  assetPrefix: "/static",

  // Emit `about/index.html` rather than `about.html`. Directory-style
  // output is what makes the StaticSiteController lookup and the nginx
  // `try_files $uri/index.html` rule line up.
  trailingSlash: true,

  // Next otherwise walks up looking for a lockfile and can land on an
  // unrelated parent, which changes where the build output lands.
  outputFileTracingRoot: projectRoot,

  images: {
    // next/image has no optimizer without a Node server. Laravel serves
    // uploads straight from /storage, so images pass through untouched.
    unoptimized: true,
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
};

export default nextConfig;
