import Link from "next/link";
import { Theme } from "@/lib/types";
import { LayersIcon, ArrowRightIcon } from "@/components/shared/icons";

export default function ThemeCard({ theme }: { theme: Theme }) {
  return (
    <Link
      href={`/themes/${theme.slug}`}
      className="card card-hover group flex flex-col h-full"
    >
      {/* Header: monochrome mark + eyebrow */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <span
          className="shrink-0 w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center text-lg"
          aria-hidden="true"
        >
          {theme.icon ? theme.icon : <LayersIcon />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary-700 truncate">
            Knowledge theme
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5">
            {theme.featured ? "Featured" : "Theme"}
          </div>
        </div>
      </div>

      {/* Title + summary */}
      <div className="px-5 flex-1">
        <h3 className="font-semibold text-ink-900 leading-snug mb-2 group-hover:text-primary-700 transition-colors line-clamp-2">
          {theme.name}
        </h3>
        <p className="text-sm text-ink-500 leading-relaxed line-clamp-3">
          {theme.summary}
        </p>
      </div>

      {/* Meta: explore affordance */}
      <div className="mt-4 mx-5 mb-5 pt-3 border-t border-ink-100">
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-700">
          Explore theme
          <ArrowRightIcon className="shrink-0 transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </Link>
  );
}
