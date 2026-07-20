"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import SearchAutocomplete from "./SearchAutocomplete";
import LanguageToggle from "./LanguageToggle";

// `key` indexes the Nav message catalog; `href` is the route.
const navLinks = [
  { href: "/projects", key: "projects" },
  { href: "/technologies", key: "technologies" },
  { href: "/partners", key: "partners" },
  { href: "/resources", key: "resources" },
  { href: "/events", key: "events" },
  { href: "/opportunities", key: "opportunities" },
  { href: "/news", key: "news" },
  { href: "/tenders", key: "tenders" },
  { href: "/map", key: "map" },
  { href: "/about", key: "about" },
] as const;

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("Nav");
  const tBrand = useTranslations("Brand");

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the mobile menu on route change so focus never strands inside it.
  const [menuPathname, setMenuPathname] = useState(pathname);
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  // Escape closes the mobile menu and returns focus to its trigger.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Move focus into the menu when it opens.
  useEffect(() => {
    if (menuOpen) menuRef.current?.querySelector("a")?.focus();
  }, [menuOpen]);

  const navLinkClass = (active: boolean) =>
    `px-2.5 py-2 rounded-md text-[13px] font-medium transition-colors whitespace-nowrap ${
      active
        ? "text-primary-700 bg-primary-50"
        : "text-ink-600 hover:text-primary-700 hover:bg-ink-50"
    }`;

  return (
    <header>
      {/* ── Utility strip: context + secondary actions (scrolls away) ── */}
      <div className="hidden sm:block bg-ink-900 text-ink-100">
        <div className="container-page">
          <div className="flex items-center justify-between h-9 text-xs">
            <span className="text-ink-300 tracking-wide">
              {tBrand("footerTagline")}
            </span>
            <div className="flex items-center gap-1">
              <LanguageToggle variant="dark" />
              <span className="w-px h-4 bg-white/15 mx-1" aria-hidden="true" />
              <Link
                href="/partner"
                className="px-2.5 py-1 rounded text-ink-200 hover:text-white hover:bg-white/10 transition-colors font-medium"
              >
                {t("partnerPortal")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main bar: logo · nav · search · primary CTA (sticky) ── */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-ink-200">
        <div className="container-page">
          <div className="flex items-center justify-between gap-4 h-16">
            {/* Logo — fixed, never wraps */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <span
                aria-hidden="true"
                className="w-9 h-9 rounded-lg bg-primary-700 flex items-center justify-center text-white font-display font-bold text-sm shrink-0"
              >
                AE
              </span>
              <span className="hidden md:flex flex-col leading-none">
                <span className="font-display font-bold text-ink-900 text-[15px] whitespace-nowrap">
                  {tBrand("name")}
                </span>
                <span className="text-[11px] text-ink-500 whitespace-nowrap mt-0.5">
                  {tBrand("tagline")}
                </span>
              </span>
            </Link>

            {/* Desktop nav */}
            <nav
              aria-label={t("label")}
              className="hidden xl:flex items-center gap-0.5 mr-auto"
            >
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? "page" : undefined}
                    className={navLinkClass(isActive)}
                  >
                    {t(link.key)}
                  </Link>
                );
              })}
            </nav>

            {/* Right actions */}
            <div className="flex items-center gap-2 shrink-0">
              <SearchAutocomplete className="hidden xl:block w-56" />
              <Link
                href="/contact"
                className="hidden sm:inline-flex btn btn-primary"
              >
                {t("submitInfo")}
              </Link>
              {/* Mobile / tablet menu button */}
              <button
                ref={menuButtonRef}
                type="button"
                className="xl:hidden p-2 rounded-md text-ink-600 hover:text-ink-900 hover:bg-ink-100 transition-colors"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                aria-label={menuOpen ? t("closeMenu") : t("openMenu")}
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  viewBox="0 0 24 24"
                >
                  {menuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile / tablet menu */}
          {menuOpen && (
            <div
              id="mobile-menu"
              ref={menuRef}
              className="xl:hidden pb-4 border-t border-ink-100 mt-1 pt-3"
            >
              <SearchAutocomplete className="mb-3" />
              <nav aria-label={t("mobileLabel")} className="grid grid-cols-2 gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => setMenuOpen(false)}
                      className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
                        isActive
                          ? "text-primary-700 bg-primary-50"
                          : "text-ink-700 hover:text-primary-700 hover:bg-ink-50"
                      }`}
                    >
                      {t(link.key)}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-3 pt-3 border-t border-ink-100 flex flex-col gap-2">
                <Link
                  href="/partner"
                  onClick={() => setMenuOpen(false)}
                  className="block px-3 py-2.5 rounded-md text-sm font-medium text-primary-700 hover:bg-primary-50"
                >
                  {t("partnerPortal")}
                </Link>
                <Link
                  href="/contact"
                  onClick={() => setMenuOpen(false)}
                  className="btn btn-primary w-full"
                >
                  {t("submitInfo")}
                </Link>
                <LanguageToggle className="mt-1 sm:hidden" />
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
