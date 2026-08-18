// ============================================================
// Canonical project-status palette.
//
// One definition for every surface that draws a status: the map markers,
// the filter chips, the status breakdown chart and its legend. It used to
// be declared three times, and they had drifted — the breakdown bar drew
// `emerald-400`/`amber-400` while its own legend dots drew #16a34a/#f59e0b,
// so the same status was two different colours a few pixels apart.
//
// Validated with the data-viz palette validator (categorical, adjacent
// pairs, light mode, #ffffff surface):
//
//   lightness band     PASS  all 4 inside L 0.43–0.77
//   CVD separation     PASS  worst adjacent ΔE 15.6 (protan)
//   normal-vision      PASS  worst adjacent ΔE 21.2
//   contrast ≥ 3:1     PASS  all 4 (the old #f59e0b/#9ca3af pair sat at 2.15/2.54)
//   chroma floor       FAIL  on Suspended only — see below
//
// Suspended is deliberately neutral: it is the "not running" state, and a
// grey that reads as absent-of-colour is the point. That is the reserved
// status case, so it never travels on colour alone — every place it
// appears carries a text label (legend, tooltip, chip, table).
// ============================================================

export const STATUS_ORDER = ["Active", "Completed", "Pipeline", "Suspended"] as const;

export type ProjectStatus = (typeof STATUS_ORDER)[number];

/** Mark colour — bars, map markers, legend dots. Never used for text. */
export const STATUS_COLOR: Record<ProjectStatus, string> = {
  Active: "#16a34a",
  Completed: "#2563eb",
  Pipeline: "#d97706",
  Suspended: "#6b7280",
};

/** Chip/pill styling for the filter controls, in text-token colours. */
export const STATUS_CHIP: Record<ProjectStatus, { bg: string; text: string; border: string }> = {
  Active: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-300" },
  Completed: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-300" },
  Pipeline: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300" },
  Suspended: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
};

export function isProjectStatus(value: string): value is ProjectStatus {
  return (STATUS_ORDER as readonly string[]).includes(value);
}
