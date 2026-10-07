import Link from "next/link";
import { Project } from "@/lib/types";
import { MapPinIcon, SproutIcon, CalendarIcon } from "@/components/shared/icons";
import { projectAccent } from "@/lib/design/cardAccents";
import { CardCover } from "@/components/public/CoverMedia";

interface ProjectCardProps {
  project: Project;
}

// Status pill sits on the colour band, so it carries its own translucent
// treatment rather than the neutral <Badge> used on light surfaces.
function statusPill(status: string): string {
  switch (status) {
    case "Active":
      return "bg-emerald-300/95 text-emerald-950";
    case "Completed":
      return "bg-sky-200/95 text-sky-950";
    case "Pipeline":
      return "bg-amber-300/95 text-amber-950";
    default:
      return "bg-white/20 text-white";
  }
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const accent = projectAccent(project.region);
  const yearRange = project.startDate
    ? `${project.startDate.slice(0, 4)}${project.endDate ? `–${project.endDate.slice(0, 4)}` : "–present"}`
    : null;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="card card-hover group flex flex-col h-full overflow-hidden"
    >
      {/* Colour band — region identity, status, featured mark */}
      <CardCover
        image={project.featuredImage}
        accent={accent.gradient}
        className="flex items-end justify-between gap-2 px-4 py-3"
      >
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="text-2xl drop-shadow-sm">
            {accent.icon}
          </span>
          <span className="truncate text-xs font-bold uppercase tracking-wider text-white/90">
            {project.region || "Uganda"}
          </span>
        </span>
        {project.status && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${statusPill(project.status)}`}
          >
            {project.status}
          </span>
        )}
        {project.featured && (
          <span className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-wide text-white/80">
            <span aria-hidden="true">★ </span>Featured
          </span>
        )}
      </CardCover>

      {/* Title + summary */}
      <div className="flex-1 px-5 pt-4">
        <h3 className="font-semibold text-ink-900 leading-snug mb-2 group-hover:text-primary-700 transition-colors line-clamp-2">
          {project.title}
        </h3>
        <p className="text-sm text-ink-500 leading-relaxed line-clamp-3">
          {project.summary}
        </p>
      </div>

      {/* Meta */}
      <div className="mt-4 mx-5 mb-5 pt-3 border-t border-ink-100 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <MapPinIcon className="text-ink-400 shrink-0" />
          <span className="truncate">{project.district || project.region || "Uganda"}</span>
        </span>
        {project.valueChain && (
          <span className="inline-flex items-center gap-1.5 min-w-0">
            <SproutIcon className="text-ink-400 shrink-0" />
            <span className="truncate">{project.valueChain}</span>
          </span>
        )}
        {yearRange && (
          <span className="inline-flex items-center gap-1.5 ml-auto tabular-nums">
            <CalendarIcon className="text-ink-400 shrink-0" />
            {yearRange}
          </span>
        )}
      </div>
    </Link>
  );
}
