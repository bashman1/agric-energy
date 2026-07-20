import Link from "next/link";
import { Technology } from "@/lib/types";
import { BoltIcon } from "@/components/shared/icons";

export default function TechCard({ tech }: { tech: Technology }) {
  return (
    <Link
      href={`/technologies/${tech.slug}`}
      className="card card-hover group flex flex-col h-full"
    >
      {/* Header: monochrome mark + eyebrow */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <span
          className="shrink-0 w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center text-lg"
          aria-hidden="true"
        >
          <BoltIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary-700 truncate">
            {tech.category}
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5">
            {tech.featured ? "Featured" : "Technology"}
          </div>
        </div>
      </div>

      {/* Title + summary */}
      <div className="px-5 flex-1">
        <h3 className="font-semibold text-ink-900 leading-snug mb-2 group-hover:text-primary-700 transition-colors line-clamp-2">
          {tech.name}
        </h3>
        <p className="text-sm text-ink-500 leading-relaxed line-clamp-3">
          {tech.summary}
        </p>
      </div>

      {/* Meta: neutral application pills */}
      {tech.applications.length > 0 && (
        <div className="mt-4 mx-5 mb-5 pt-3 border-t border-ink-100 flex flex-wrap items-center gap-1.5">
          {tech.applications.slice(0, 2).map((app) => (
            <span
              key={app}
              className="text-xs bg-ink-50 text-ink-600 px-2 py-0.5 rounded-full border border-ink-200"
            >
              {app}
            </span>
          ))}
          {tech.applications.length > 2 && (
            <span className="text-xs text-ink-400">
              +{tech.applications.length - 2}
            </span>
          )}
        </div>
      )}
    </Link>
  );
}
