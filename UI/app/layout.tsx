import type { Metadata } from "next";
import IntlProvider from "@/components/i18n/IntlProvider";
import SkipLink from "@/components/i18n/SkipLink";
import { defaultLocale } from "@/lib/i18n";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Agri-Energy Desk | Uganda's National Agri-Energy Platform",
    template: "%s | Agri-Energy Desk",
  },
  description:
    "Uganda's national digital knowledge and project intelligence platform for energy use in agriculture. Explore agri-energy projects, technologies, partners, and resources.",
  keywords: [
    "agri-energy",
    "Uganda",
    "solar pumping",
    "biogas",
    "renewable energy",
    "agriculture",
    "NREP",
  ],
  openGraph: {
    title: "Agri-Energy Desk — Uganda's National Platform",
    description:
      "Explore agri-energy technologies, projects, and resources from across Uganda.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The export prerenders once, with no request to read a locale from, so
  // the document ships as the default locale and IntlProvider switches it
  // in the browser (cookie → navigator.languages → default).
  return (
    <html lang={defaultLocale} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* Scroll-reveal elements start hidden and are shown by JS. Without
            JS there is no observer to reveal them, so un-hide them here. */}
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html:
                "[data-reveal]{opacity:1!important;transform:none!important}.bar-fill{width:var(--w,0)!important}",
            }}
          />
        </noscript>
        {/*
          Theme bootstrap. Runs before first paint so a dark-theme visitor
          never sees a white flash. Kept in sync with THEME_STORAGE_KEY in
          components/public/ThemeToggle.tsx.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                try {
                  var stored = localStorage.getItem('agri-energy-theme');
                  var dark = stored
                    ? stored === 'dark'
                    : window.matchMedia('(prefers-color-scheme: dark)').matches;
                  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
                } catch (e) {
                  document.documentElement.dataset.theme = 'light';
                }
              })();
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__nextError = window.__nextError || [];
              window.onerror = function(msg, url, line, col, err) {
                window.__nextError.push({msg, url, line, col, stack: err && err.stack});
              };
              window.addEventListener('unhandledrejection', function(e) {
                window.__nextError.push({msg: 'unhandled rejection', reason: e.reason});
              });
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-ink-50">
        <IntlProvider>
          {/* Keyboard users land here first — jumps past the header nav. */}
          <SkipLink />
          {/*
            Each page renders its own <header>/<main>/<footer> landmarks, so
            this is a focusable wrapper rather than a second <main> element.
          */}
          <div id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </div>
        </IntlProvider>
      </body>
    </html>
  );
}
