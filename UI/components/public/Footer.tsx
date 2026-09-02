"use client";
// Client component so it can be rendered from client pages (e.g. /contact)
// as well as server pages.
import Link from "next/link";
import { useTranslations } from "next-intl";
import NewsletterSignup from "@/components/public/NewsletterSignup";
import LanguageToggle from "@/components/public/LanguageToggle";
import { MapPinIcon } from "@/components/shared/icons";

export default function Footer() {
  const t = useTranslations("Footer");
  const tBrand = useTranslations("Brand");

  const linkClass =
    "text-shade-400 hover:text-primary-300 transition-colors";

  const platformLinks: [string, string][] = [
    ["projects", "/projects"],
    ["technologies", "/technologies"],
    ["themes", "/themes"],
    ["partners", "/partners"],
    ["resources", "/resources"],
    ["mapView", "/map"],
    ["news", "/news"],
    ["tenders", "/tenders"],
    ["openData", "/data"],
  ];

  const aboutLinks: [string, string][] = [
    ["aboutLink", "/about"],
    ["contact", "/contact"],
    ["submitInformation", "/contact"],
    ["accessibility", "/accessibility"],
    ["adminPortal", "/admin"],
  ];

  return (
    <footer aria-label={t("label")} className="bg-shade-900 text-shade-300">
      <div className="container-page py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8">
          {/* Brand + newsletter */}
          <div className="lg:col-span-5">
            <div className="flex items-center gap-3 mb-4">
              <span
                aria-hidden="true"
                className="w-10 h-10 rounded-lg bg-primary-700 flex items-center justify-center text-white font-display font-bold text-sm"
              >
                AE
              </span>
              <div>
                <div className="font-display font-bold text-white text-base leading-tight">
                  {tBrand("name")}
                </div>
                <div className="text-xs text-shade-400 leading-tight">
                  {tBrand("footerTagline")}
                </div>
              </div>
            </div>
            <p className="text-sm text-shade-400 leading-relaxed max-w-md">
              {t("description")}
            </p>

            <div className="mt-6 max-w-sm">
              <NewsletterSignup variant="footer" />
            </div>

            <LanguageToggle variant="dark" className="mt-6" />
          </div>

          <div className="lg:col-span-1 hidden lg:block" aria-hidden="true" />

          {/* Platform links */}
          <nav aria-label={t("platform")} className="lg:col-span-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-primary-300 mb-4">
              {t("platform")}
            </h2>
            <ul className="space-y-2.5 text-sm">
              {platformLinks.map(([key, href]) => (
                <li key={href}>
                  <Link href={href} className={linkClass}>
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* About / Contact */}
          <nav aria-label={t("about")} className="lg:col-span-3">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-primary-300 mb-4">
              {t("about")}
            </h2>
            <ul className="space-y-2.5 text-sm">
              {aboutLinks.map(([key, href]) => (
                <li key={href + key}>
                  <Link href={href} className={linkClass}>
                    {t(key)}
                  </Link>
                </li>
              ))}
            </ul>
            <address className="mt-5 text-sm not-italic space-y-1.5">
              <div>
                <a
                  href="mailto:info@agrienergy.nrep.ug"
                  className={linkClass}
                >
                  info@agrienergy.nrep.ug
                </a>
              </div>
              <div>
                <a href="tel:+256414123456" className={linkClass}>
                  +256 414 123 456
                </a>
              </div>
              <div className="flex items-start gap-1.5 text-shade-400">
                <MapPinIcon className="text-shade-500 shrink-0 mt-0.5" />
                <span>Kampala, Uganda</span>
              </div>
            </address>
          </nav>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-shade-500">
          <p>{t("copyright", { year: String(new Date().getFullYear()) })}</p>
          <p>{t("builtWith")}</p>
        </div>
      </div>
    </footer>
  );
}
