"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import SearchAutocomplete from "./SearchAutocomplete";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";

// `key` indexes the Nav message catalog; `href` is the route.
interface NavLink {
  href: string;
  key: string;
  /**
   * Path used for active-state matching, when it cannot be derived from
   * `href` — i.e. when `href` carries a query string. `usePathname()`
   * never includes the query, so `startsWith(href)` would never match.
   */
  match?: string;
}

/** A nav entry is either a link or a group rendered as a dropdown. */
type NavEntry = NavLink | { key: string; children: NavLink[] };

const navEntries: NavEntry[] = [
  { href: "/projects", key: "projects" },
  { href: "/technologies", key: "technologies" },
  { href: "/themes", key: "themes" },
  {
    // The directory holds two different kinds of actor and visitors arrive
    // looking for one or the other, so the menu offers them separately
    // rather than one undifferentiated "Partners" link. Both land on
    // /partners with the kind pre-selected (see PartnersBrowser).
    //
    // Registration is deliberately NOT here — it lives on the Partner
    // Portal link in the utility strip and on /partner itself.
    key: "ecosystem",
    children: [
      {
        href: "/partners/?kind=individual",
        key: "partnersIndividual",
        match: "/partners",
      },
      {
        href: "/partners/?kind=organization",
        key: "partnersOrganization",
        match: "/partners",
      },
    ],
  },
  { href: "/resources", key: "resources" },
  {
    // Tenders live under Opportunities, so they stay out of the top level.
    key: "updates",
    children: [
      { href: "/events", key: "events" },
      { href: "/opportunities", key: "opportunities" },
      { href: "/news", key: "news" },
    ],
  },
  { href: "/map", key: "map" },
  { href: "/about", key: "about" },
];

function isGroup(entry: NavEntry): entry is { key: string; children: NavLink[] } {
  return "children" in entry;
}

/** Both register links share a path, so both highlight on the wizard. */
function isLinkActive(link: Pick<NavLink, "href" | "match">, pathname: string) {
  return pathname.startsWith(link.match ?? link.href);
}

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
      <div className="hidden sm:block bg-shade-900 text-shade-100">
        <div className="container-page">
          <div className="flex items-center justify-between h-9 text-xs">
            <span className="text-shade-300 tracking-wide">
              {tBrand("footerTagline")}
            </span>
            <div className="flex items-center gap-1">
              <LanguageToggle variant="dark" />
              <span className="w-px h-4 bg-white/15 mx-1" aria-hidden="true" />
              <ThemeToggle variant="dark" />
              <span className="w-px h-4 bg-white/15 mx-1" aria-hidden="true" />
              <Link
                href="/partner"
                className="px-2.5 py-1 rounded text-shade-200 hover:text-white hover:bg-white/10 transition-colors font-medium"
              >
                {t("partnerPortal")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main bar: logo · nav · search · primary CTA (sticky) ── */}
      <div className="sticky top-0 z-50 bg-surface/95 backdrop-blur border-b border-ink-200">
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
              {navEntries.map((entry) => {
                if (isGroup(entry)) {
                  return (
                    <NavDropdown
                      key={entry.key}
                      label={t(entry.key)}
                      items={entry.children.map((child) => ({
                        href: child.href,
                        match: child.match,
                        label: t(child.key),
                      }))}
                      pathname={pathname}
                      linkClass={navLinkClass}
                    />
                  );
                }
                const isActive = isLinkActive(entry, pathname);
                return (
                  <Link
                    key={entry.href}
                    href={entry.href}
                    aria-current={isActive ? "page" : undefined}
                    className={navLinkClass(isActive)}
                  >
                    {t(entry.key)}
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
                {navEntries.map((entry) =>
                  isGroup(entry) ? (
                    // Groups keep their heading on mobile — no nested dropdown.
                    <div key={entry.key} className="col-span-2 mt-2">
                      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                        {t(entry.key)}
                      </p>
                      <div className="grid grid-cols-2 gap-1">
                        {entry.children.map((child) => (
                          <MobileNavLink
                            key={child.href}
                            href={child.href}
                            label={t(child.key)}
                            active={isLinkActive(child, pathname)}
                            onNavigate={() => setMenuOpen(false)}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <MobileNavLink
                      key={entry.href}
                      href={entry.href}
                      label={t(entry.key)}
                      active={isLinkActive(entry, pathname)}
                      onNavigate={() => setMenuOpen(false)}
                    />
                  )
                )}
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
                <div className="mt-1 flex items-center justify-between gap-2">
                  <LanguageToggle className="sm:hidden" />
                  <ThemeToggle className="ml-auto" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── Desktop nav dropdown ─────────────────────────────────────

interface NavDropdownProps {
  label: string;
  items: { href: string; match?: string; label: string }[];
  pathname: string;
  linkClass: (active: boolean) => string;
}

function NavDropdown({ label, items, pathname, linkClass }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const isActive = items.some((item) => isLinkActive(item, pathname));

  // Close when the route changes so the panel never outlives its page.
  const [seenPathname, setSeenPathname] = useState(pathname);
  if (seenPathname !== pathname) {
    setSeenPathname(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    // A click or a tab-stop outside the group dismisses the panel.
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    // Click toggles the panel — predictable on touch as well as pointer.
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`${linkClass(isActive)} inline-flex items-center gap-1`}
      >
        {label}
        <svg
          aria-hidden="true"
          focusable="false"
          className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <ul className="absolute left-0 top-full z-50 w-52 rounded-lg border border-ink-200 bg-white py-1 shadow-lg">
          {items.map((item) => {
            const active = isLinkActive(item, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={`block px-3 py-2 text-[13px] font-medium transition-colors ${
                    active
                      ? "text-primary-700 bg-primary-50"
                      : "text-ink-700 hover:text-primary-700 hover:bg-ink-50"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ─── Mobile nav link ──────────────────────────────────────────

interface MobileNavLinkProps {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
}

function MobileNavLink({ href, label, active, onNavigate }: MobileNavLinkProps) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={`block px-3 py-2.5 rounded-md text-sm font-medium ${
        active
          ? "text-primary-700 bg-primary-50"
          : "text-ink-700 hover:text-primary-700 hover:bg-ink-50"
      }`}
    >
      {label}
    </Link>
  );
}
