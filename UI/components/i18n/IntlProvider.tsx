// ============================================================
// IntlProvider — client-side locale resolution for the static export.
//
// Replaces i18n/request.ts, which read cookies()/headers() per request.
// A static export has no request: every page is prerendered once, at
// build time, so the locale has to be resolved in the browser.
//
// All three message catalogues are bundled (~10 KB total). Lazy-loading
// them per locale would save little and cost a flash of untranslated
// content on first paint.
// ============================================================
"use client";

import { NextIntlClientProvider } from "next-intl";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en from "@/messages/en.json";
import fr from "@/messages/fr.json";
import sw from "@/messages/sw.json";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
  defaultLocale,
  isLocale,
  localeFromAcceptLanguage,
} from "@/lib/i18n";

const messages = { en, fr, sw } as const;

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

/** Cookie → navigator.languages → default. The header is gone client-side. */
function detectLocale(): Locale {
  const stored = readCookie(LOCALE_COOKIE);
  if (isLocale(stored)) return stored;
  return localeFromAcceptLanguage(navigator.languages?.join(",") ?? null);
}

export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
}

/**
 * Locale switching used to be "write the cookie, refresh the server
 * components". There is no server to refresh now, so the switcher calls
 * into this context and the provider re-renders with new messages.
 */
const SwitchLocaleContext = createContext<(locale: Locale) => void>(() => {});

export function useSwitchLocale(): (locale: Locale) => void {
  return useContext(SwitchLocaleContext);
}

export default function IntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Start on the default locale so the client's first render matches the
  // prerendered HTML; switch after mount to avoid a hydration mismatch.
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const detected = detectLocale();
    setLocale(detected);
    setLocaleCookie(detected);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const switchLocale = useCallback((next: Locale) => {
    setLocale(next);
    setLocaleCookie(next);
  }, []);

  return (
    <SwitchLocaleContext.Provider value={switchLocale}>
      <NextIntlClientProvider
        locale={locale}
        messages={messages[locale]}
        timeZone="Africa/Kampala"
      >
        {children}
      </NextIntlClientProvider>
    </SwitchLocaleContext.Provider>
  );
}
