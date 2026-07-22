// ============================================================
// BarChartH — horizontal bar chart as an accessible list.
//
// Pure server component. Renders as a <ul> where each row shows a text
// label + value (always present — reads cleanly for screen readers and
// no-JS users); the coloured bar is decorative (aria-hidden). Values are
// formatted by the caller and passed in as `display` strings, so no
// number formatting runs here.
//
// Motion: each fill sets its target width as the `--w` CSS custom
// property. When wrapped in a <Reveal>, globals.css grows the bars from 0
// to `--w` the first time the chart scrolls into view (see the `.bar-fill`
// rules). Reduced motion → bars render at full width, no growth.
// ============================================================

import type { CSSProperties } from "react";

export interface BarDatum {
  label: string;
  value: number;
  /** Pre-formatted value string rendered at the end of the row. */
  display: string;
}

interface BarChartHProps {
  data: BarDatum[];
  className?: string;
}

export default function BarChartH({ data, className }: BarChartHProps) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <ul className={className}>
      {data.map((d) => {
        const pct = Math.max(2, (d.value / max) * 100);
        return (
          <li key={d.label} className="flex items-center gap-3 py-1.5">
            <span className="w-28 shrink-0 truncate text-sm text-ink-600">
              {d.label}
            </span>
            <span
              aria-hidden="true"
              className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100"
            >
              <span
                className="bar-fill absolute inset-y-0 left-0 rounded-full bg-accent-500"
                style={{ "--w": `${pct}%` } as CSSProperties}
              />
            </span>
            <span className="w-16 shrink-0 text-right text-sm font-semibold tabular-nums text-ink-800">
              {d.display}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
