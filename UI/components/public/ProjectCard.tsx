import Link from "next/link";
import { Project } from "@/lib/types";
import Badge from "@/components/shared/Badge";
import { MapPinIcon, SproutIcon, CalendarIcon } from "@/components/shared/icons";

interface ProjectCardProps {
  project: Project;
}

// Status → semantic color. This is the ONLY colour that varies per card;
// everything else is neutral so a grid reads as one calm system.
function statusColor(status: string): "green" | "blue" | "yellow" | "gray" {
  if (status === "Active") return "green";
  if (status === "Completed") return "blue";
  if (status === "Pipeline") return "yellow";
  return "gray";
}

export default function ProjectCard({ project }: ProjectCardProps) {
  const isNational = project.region?.toLowerCase() === "national";
  const eyebrow = project.valueChain || (isNational ? "National Programme" : "Agri-Energy");
  const yearRange = project.startDate
    ? `${project.startDate.slice(0, 4)}${project.endDate ? `–${project.endDate.slice(0, 4)}` : "–present"}`
    : null;

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="card card-hover group flex flex-col h-full"
    >
      {/* Header: monochrome mark + eyebrow, status right */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <span
          className="shrink-0 w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center text-lg"
          aria-hidden="true"
        >
          <SproutIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary-700 truncate">
            {eyebrow}
          </div>
          <div className="text-[11px] text-ink-400 mt-0.5">
            {project.featured ? "Featured project" : "Project"}
          </div>
        </div>
        <Badge label={project.status} color={statusColor(project.status)} dot />
      </div>

      {/* Title + summary */}
      <div className="px-5 flex-1">
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
