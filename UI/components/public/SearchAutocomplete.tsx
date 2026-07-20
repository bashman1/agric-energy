"use client";
// ============================================================
// SearchAutocomplete — debounced typeahead over the public
// GET /search/suggest endpoint, implemented as a WAI-ARIA 1.2
// combobox (listbox popup). Keyboard: ↑/↓ move, Enter opens the
// active suggestion (or submits the raw query), Escape closes.
// ============================================================
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export interface Suggestion {
  title: string;
  type: string;
  href: string;
}

interface Props {
  /** Pre-fill the input (e.g. the current query on /search). */
  defaultValue?: string;
  /** Visual treatment: compact for the header, large for the search page. */
  variant?: "header" | "page";
  placeholder?: string;
  autoFocus?: boolean;
  /** Accessible label for the input. Falls back to the translated "Search". */
  label?: string;
  className?: string;
}

const DEBOUNCE_MS = 250;
const MIN_CHARS = 2;

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000/api/v1";

export default function SearchAutocomplete({
  defaultValue = "",
  variant = "header",
  placeholder,
  autoFocus = false,
  label,
  className = "",
}: Props) {
  const t = useTranslations("Search");
  const tTypes = useTranslations("Types");
  const router = useRouter();

  const [query, setQuery] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = `${useId()}-listbox`;
  const optionId = (index: number) => `${listboxId}-option-${index}`;

  // ── Debounced fetch ────────────────────────────────────────
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/search/suggest?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal, headers: { Accept: "application/json" } }
        );
        if (!res.ok) throw new Error(`Suggest failed: ${res.status}`);
        const json = (await res.json()) as { data?: Suggestion[] };
        setSuggestions(Array.isArray(json.data) ? json.data : []);
        setOpen(true);
        setActiveIndex(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // ── Click outside closes the popup ─────────────────────────
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  // ── Group suggestions by type, preserving API order ────────
  const groups = useMemo(() => {
    const byType = new Map<string, { suggestion: Suggestion; index: number }[]>();
    suggestions.forEach((suggestion, index) => {
      const bucket = byType.get(suggestion.type) ?? [];
      bucket.push({ suggestion, index });
      byType.set(suggestion.type, bucket);
    });
    return [...byType.entries()];
  }, [suggestions]);

  const typeLabel = useCallback(
    (type: string) => {
      // Fall back to the raw type when the catalog has no entry for it.
      const translated = tTypes.has(type) ? tTypes(type) : "";
      return translated || type.replace(/[-_]/g, " ");
    },
    [tTypes]
  );

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setActiveIndex(-1);
      router.push(href);
    },
    [router]
  );

  const submitQuery = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    setOpen(false);
    setActiveIndex(-1);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }, [query, router]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!suggestions.length) return;
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActiveIndex(e.key === "ArrowDown" ? 0 : suggestions.length - 1);
        return;
      }
      setActiveIndex((prev) => {
        const next = e.key === "ArrowDown" ? prev + 1 : prev - 1;
        if (next < 0) return suggestions.length - 1;
        if (next >= suggestions.length) return 0;
        return next;
      });
      return;
    }

    if (e.key === "Enter") {
      if (open && activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        go(suggestions[activeIndex].href);
      }
      return; // otherwise let the form submit handler run
    }

    if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (e.key === "Tab") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  const isPage = variant === "page";
  const inputLabel = label ?? t("label");
  const showPopup = open && (loading || suggestions.length > 0);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          submitQuery();
        }}
        className={isPage ? "flex gap-2" : "flex items-center gap-2"}
      >
        <label htmlFor={`${listboxId}-input`} className="sr-only">
          {inputLabel}
        </label>
        <input
          id={`${listboxId}-input`}
          ref={inputRef}
          name="q"
          type="text"
          value={query}
          // Opt-in only: the /search page focuses its search box, which is the
          // primary purpose of that page (WCAG 3.2.1 is not violated here).
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          autoComplete="off"
          placeholder={placeholder ?? t(isPage ? "pagePlaceholder" : "placeholder")}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (suggestions.length) setOpen(true);
          }}
          role="combobox"
          aria-expanded={showPopup}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            showPopup && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          className={
            isPage
              ? "flex-1 px-4 py-3 rounded-xl bg-white text-gray-900 text-sm font-medium placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white/70"
              : "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-primary-600"
          }
        />
        <button
          type="submit"
          className={
            isPage
              ? "px-6 py-3 bg-white text-primary-800 font-bold rounded-xl hover:bg-primary-50 transition-colors text-sm whitespace-nowrap"
              : "px-3 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors whitespace-nowrap"
          }
        >
          {t("submit")}
        </button>
      </form>

      {/* Live region so screen readers hear result counts */}
      <div aria-live="polite" className="sr-only">
        {loading
          ? t("loading")
          : query.trim().length >= MIN_CHARS
            ? t("resultCount", { count: suggestions.length })
            : ""}
      </div>

      {showPopup && (
        <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-h-96 overflow-y-auto">
          <ul id={listboxId} role="listbox" aria-label={t("suggestionsLabel")}>
            {loading && suggestions.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-500">{t("loading")}</li>
            )}
            {groups.map(([type, items]) => (
              <li key={type} role="presentation">
                <div className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  {typeLabel(type)}
                </div>
                <ul role="group" aria-label={typeLabel(type)}>
                  {items.map(({ suggestion, index }) => (
                    <li
                      key={suggestion.href}
                      id={optionId(index)}
                      role="option"
                      aria-selected={activeIndex === index}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(e) => {
                        // Fire before the input blurs so the popup stays alive.
                        e.preventDefault();
                        go(suggestion.href);
                      }}
                      className={`px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                        activeIndex === index
                          ? "bg-primary-50 text-primary-800"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {suggestion.title}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
            {!loading && suggestions.length === 0 && (
              <li className="px-4 py-3 text-sm text-gray-500">
                {t("noSuggestions")}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
