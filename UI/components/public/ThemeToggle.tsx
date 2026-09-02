"use client";
// ============================================================
// ThemeToggle — switches the document between the light and dark themes.
//
// The theme is a `data-theme` attribute on <html>; every colour token in
// globals.css keys off it. An inline script in app/layout.tsx applies the
// stored (or OS-preferred) value before first paint, so this component
// only writes the attribute and localStorage.
//
// The attribute — not React state — is the source of truth, so the button
// reads it through useSyncExternalStore: the server snapshot is "light"
// (matching the prerendered HTML, so hydration is clean) and a
// MutationObserver picks up the real value plus any later change, whoever
// made it.
// ============================================================
import { useCallback, useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/** Shared with the inline bootstrap script in app/layout.tsx. */
export const THEME_STORAGE_KEY = "agri-energy-theme";

function subscribe(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });

  // With no explicit choice stored, keep following the OS setting.
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMediaChange = (e: MediaQueryListEvent) => {
    try {
      if (localStorage.getItem(THEME_STORAGE_KEY)) return;
    } catch {
      /* storage blocked — fall through and follow the OS */
    }
    document.documentElement.dataset.theme = e.matches ? "dark" : "light";
  };
  media.addEventListener("change", onMediaChange);

  return () => {
    observer.disconnect();
    media.removeEventListener("change", onMediaChange);
  };
}

const getSnapshot = (): Theme =>
  document.documentElement.dataset.theme === "dark" ? "dark" : "light";

/** The export prerenders in the light theme; the script fixes it up. */
const getServerSnapshot = (): Theme => "light";

interface Props {
  /** Colour treatment — light chrome (menus) or dark chrome (utility strip). */
  variant?: "light" | "dark";
  className?: string;
}

export default function ThemeToggle({ variant = "light", className = "" }: Props) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Theme =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private mode — the choice just will not persist */
    }
  }, []);

  const isDarkChrome = variant === "dark";
  const label = theme === "dark" ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      aria-pressed={theme === "dark"}
      className={`theme-toggle inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors ${
        isDarkChrome
          ? "text-shade-200 hover:text-white hover:bg-white/10"
          : "text-ink-600 hover:text-primary-700 hover:bg-ink-50"
      } ${className}`}
    >
      {theme === "dark" ? <SunGlyph /> : <MoonGlyph />}
      <span className={isDarkChrome ? "sr-only" : ""}>
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}

function SunGlyph() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.9} strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonGlyph() {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}
