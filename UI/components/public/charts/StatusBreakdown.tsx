"use client";

// ============================================================
// Status breakdown — a part-to-whole stacked bar.
//
// Part-to-whole across 4 classes is exactly what a single stacked bar is
// for, so the form is unchanged; what changed is the execution:
//
//  • segments and legend dots now draw the same canonical colour
//  • 2px surface gaps do the separating, instead of butting fills together
//  • the data-end is rounded, the baseline end square
//  • a hover/focus tooltip reads out each segment, since a thin segment
//    has no room for an inline label
//
// Values are never gated behind the tooltip: the legend below carries
// every count and share as text.
// ============================================================

import { useId, useState } from "react";
import { STATUS_COLOR, STATUS_ORDER, type ProjectStatus } from "@/lib/viz/status";

interface Props {
  byStatus: Record<string, number>;
  total: number;
  /** Statuses currently used as filters, so the legend can show state. */
  activeFilters: readonly string[];
  onToggle: (status: ProjectStatus) => void;
}

export default function StatusBreakdown({ byStatus, total, activeFilters, onToggle }: Props) {
  const [hovered, setHovered] = useState<ProjectStatus | null>(null);
  const titleId = useId();

  if (!total) return null;

  const segments = STATUS_ORDER.map((status) => ({
    status,
    count: byStatus[status] ?? 0,
    pct: (byStatus[status] ?? 0) / total * 100,
  })).filter((s) => s.count > 0);

  // Tooltip anchor: the midpoint of the hovered segment, as a percentage
  // of the bar. Cumulative rather than per-segment so it survives gaps.
  let runningPct = 0;
  const midpoints = new Map<ProjectStatus, number>();
  for (const s of segments) {
    midpoints.set(s.status, runningPct + s.pct / 2);
    runningPct += s.pct;
  }

  const active = hovered ? segments.find((s) => s.status === hovered) : null;

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-4 py-3 shadow-card">
      <div className="flex items-center justify-between mb-2">
        <span id={titleId} className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">
          Status breakdown
        </span>
        <span className="text-[11px] text-gray-400 tabular-nums">{total} total</span>
      </div>

      <div className="relative">
        {/* Tooltip. Sits above the bar and is clamped away from both edges
            so it never runs outside the card on an end segment. */}
        {active && (
          <div
            role="status"
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg"
            style={{ left: `clamp(3rem, ${midpoints.get(active.status)}%, calc(100% - 3rem))` }}
          >
            {active.status}: {active.count} ({Math.round(active.pct)}%)
          </div>
        )}

        {/* The bar. gap-[2px] is the surface gap that separates fills —
            no borders are drawn around the segments. */}
        <div className="flex h-2.5 gap-[2px]" aria-labelledby={titleId}>
          {segments.map((s, i) => (
            // A real button, so a keyboard user gets the same readout on
            // focus that a pointer user gets on hover — and clicking a
            // segment filters, exactly like clicking its legend entry.
            <button
              key={s.status}
              type="button"
              aria-label={`${s.status}: ${s.count} of ${total} projects`}
              aria-pressed={activeFilters.includes(s.status)}
              className={`transition-opacity ${i === 0 ? "rounded-l-full" : ""} ${
                i === segments.length - 1 ? "rounded-r-full" : ""
              }`}
              style={{
                width: `${s.pct}%`,
                background: STATUS_COLOR[s.status],
                opacity: hovered && hovered !== s.status ? 0.45 : 1,
              }}
              onClick={() => onToggle(s.status)}
              onMouseEnter={() => setHovered(s.status)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(s.status)}
              onBlur={() => setHovered(null)}
            />
          ))}
        </div>
      </div>

      {/* Legend — always present, and the place every value is readable as
          text. Clicking a row filters, matching the chips above. */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2.5">
        {segments.map((s) => {
          const isFiltered = activeFilters.includes(s.status);
          return (
            <button
              key={s.status}
              type="button"
              onClick={() => onToggle(s.status)}
              onMouseEnter={() => setHovered(s.status)}
              onMouseLeave={() => setHovered(null)}
              aria-pressed={isFiltered}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold transition-colors ${
                isFiltered ? "text-gray-900 underline" : "text-gray-500 hover:text-gray-800"
              }`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: STATUS_COLOR[s.status] }}
              />
              {s.status}
              <span className="font-normal text-gray-400 tabular-nums">
                {s.count} · {Math.round(s.pct)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
