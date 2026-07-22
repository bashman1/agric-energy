import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Locale comes from the `locale` cookie (see i18n/request.ts + middleware).
  const locale = await getLocale();
  const t = await getTranslations("Nav");

  return (
    <html lang={locale} suppressHydrationWarning>
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
      </head>
      <body className="min-h-screen bg-gray-50">
        <NextIntlClientProvider>
          {/* Keyboard users land here first — jumps past the header nav. */}
          <a href="#main-content" className="skip-link">
            {t("skipToContent")}
          </a>
          {/*
            Each page renders its own <header>/<main>/<footer> landmarks, so
            this is a focusable wrapper rather than a second <main> element.
          */}
          <div id="main-content" tabIndex={-1} className="outline-none">
            {children}
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
