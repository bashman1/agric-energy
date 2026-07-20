"use client";
// ============================================================
// LanguageToggle — switches the UI locale by writing the `locale`
// cookie and refreshing the server components (next-intl resolves
// the locale from that cookie; there is no URL prefix).
// ============================================================
import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  localeNames,
  locales,
  type Locale,
} from "@/lib/i18n";

interface Props {
  /** Colour treatment — light chrome (header) or dark chrome (footer). */
  variant?: "light" | "dark";
  className?: string;
}

export default function LanguageToggle({
  variant = "light",
  className = "",
}: Props) {
  const t = useTranslations("Language");
  const router = useRouter();
  const active = useLocale();
  const [value, setValue] = useState(active);
  const [isPending, startTransition] = useTransition();
  const selectId = `${useId()}-locale`;

  const onChange = (next: Locale) => {
    setValue(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; samesite=lax`;
    startTransition(() => router.refresh());
  };

  const isDark = variant === "dark";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <label htmlFor={selectId} className="sr-only">
        {t("change")}
      </label>
      <span aria-hidden="true" className={isDark ? "text-gray-500" : "text-gray-400"}>
        🌐
      </span>
      <select
        id={selectId}
        value={value}
        disabled={isPending}
        onChange={(e) => onChange(e.target.value as Locale)}
        className={`text-sm font-medium rounded-md py-1.5 pl-2 pr-6 border transition-colors focus:outline-none focus:ring-2 focus:ring-primary-600 disabled:opacity-60 ${
          isDark
            ? "bg-gray-900 border-gray-700 text-gray-300 hover:text-white"
            : "bg-white border-gray-200 text-gray-700 hover:text-primary-700"
        }`}
      >
        {locales.map((locale) => (
          <option key={locale} value={locale}>
            {localeNames[locale]}
          </option>
        ))}
      </select>
    </div>
  );
}
