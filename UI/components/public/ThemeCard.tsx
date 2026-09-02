import Link from "next/link";
import { Theme } from "@/lib/types";
import { ArrowRightIcon } from "@/components/shared/icons";
import { themeAccent } from "@/lib/design/cardAccents";

export default function ThemeCard({ theme }: { theme: Theme }) {
  const accent = themeAccent(theme.slug, theme.icon);

  return (
    <Link
      href={`/themes/${theme.slug}`}
      className="card card-hover group flex flex-col h-full overflow-hidden"
    >
      {/* Colour band — one hue per theme, so the hub reads as a set */}
      <div className={`${accent.gradient} relative flex h-24 items-center justify-center`}>
        <span
          aria-hidden="true"
          className="text-4xl drop-shadow transition-transform duration-300 group-hover:scale-110"
        >
          {accent.icon}
        </span>
        {theme.featured && (
          <span className="absolute top-2 right-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Featured
          </span>
        )}
      </div>

      {/* Title + summary */}
      <div className="flex-1 px-5 pt-4">
        <h3 className="font-semibold text-ink-900 leading-snug mb-2 group-hover:text-primary-700 transition-colors line-clamp-2">
          {theme.name}
        </h3>
        <p className="text-sm text-ink-500 leading-relaxed line-clamp-3">
          {theme.summary}
        </p>
      </div>

      {/* Explore affordance */}
      <div className="mt-4 mx-5 mb-5 pt-3 border-t border-ink-100">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700">
          Explore theme
          <ArrowRightIcon className="shrink-0 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
