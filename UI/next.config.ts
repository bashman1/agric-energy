import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// next-intl: cookie-based locale detection (no [locale] URL segment).
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Allow images from external URLs for partner logos, project images
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Required for Node.js server deployment (not static export)
  // This enables fs-based JSON data storage for Phase 1
  experimental: {},
};

export default withNextIntl(nextConfig);
