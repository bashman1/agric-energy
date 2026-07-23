// Keyboard users land here first — jumps past the header nav.
// A client component because the root layout no longer resolves
// translations server-side (see IntlProvider).
"use client";

import { useTranslations } from "next-intl";

export default function SkipLink() {
  const t = useTranslations("Nav");

  return (
    <a href="#main-content" className="skip-link">
      {t("skipToContent")}
    </a>
  );
}
