import Link from "next/link";
import { Technology } from "@/lib/types";
import { techAccent } from "@/lib/design/cardAccents";
import { CardCover } from "@/components/public/CoverMedia";

export default function TechCard({ tech }: { tech: Technology }) {
  const accent = techAccent(tech.category);

  return (
    <Link
      href={`/technologies/${tech.slug}`}
      className="card card-hover group flex flex-col h-full overflow-hidden"
    >
      {/* Colour band — the category's identity, carried by hue and mark */}
      <CardCover
        image={tech.featuredImage}
        accent={accent.gradient}
        className={`flex gap-3 px-5 ${tech.featuredImage ? "items-end pb-4" : "items-center"}`}
      >
        <span aria-hidden="true" className="text-3xl drop-shadow-sm">
          {accent.icon}
        </span>
        <h3 className="text-white font-semibold text-sm leading-tight line-clamp-2">
          {tech.name}
        </h3>
        {tech.featured && (
          <span
            className="absolute top-2 right-2 rounded-full bg-amber-300/95 px-2 py-0.5 text-[10px] font-bold text-amber-900"
            title="Featured technology"
          >
            <span aria-hidden="true">★</span>
            <span className="sr-only">Featured</span>
          </span>
        )}
      </CardCover>

      {/* Body — the clamped summary must not be the flex item itself, or
          `flex-1` stretches it and the line clamp stops bounding it. */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex-1">
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-block rounded-full border border-primary-100 bg-primary-50 px-2 py-0.5 text-[11px] font-semibold text-primary-700">
              {tech.category}
            </span>
            {tech.subcategory && (
              <span className="inline-block rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-[11px] font-semibold text-ink-600">
                {tech.subcategory}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-ink-500 leading-relaxed line-clamp-3">
            {tech.summary}
          </p>
        </div>

        {tech.applications.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-ink-100 pt-3">
            {tech.applications.slice(0, 2).map((app) => (
              <span
                key={app}
                className="rounded-full border border-ink-200 bg-ink-50 px-2 py-0.5 text-xs text-ink-600 line-clamp-1"
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
      </div>
    </Link>
  );
}
