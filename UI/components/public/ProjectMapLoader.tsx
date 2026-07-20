// ProjectMapLoader — dynamically imports ProjectMap (client-only, no SSR)
// This avoids MapLibre importing on the server where `window` is undefined.
"use client";
import dynamic from "next/dynamic";
import type { Project } from "@/lib/types";
import type { RegionStat } from "@/lib/data/open-data";

export interface ProjectMapProps {
  projects: Project[];
  regionFilter?: string;
  districtFilter?: string;
  /** Per-region aggregates powering the regional choropleth overlay. */
  regionStats?: RegionStat[];
}

const ProjectMap = dynamic(() => import("./ProjectMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-[#0d1b2a] flex items-center justify-center rounded-xl">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading map…</p>
      </div>
    </div>
  ),
});

export default function ProjectMapLoader(props: ProjectMapProps) {
  return <ProjectMap {...props} />;
}
