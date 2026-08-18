"use client";

// ============================================================
// Regional aggregates — small multiples.
//
// Three measures (projects, budget, beneficiaries) across four regions.
// They are on wildly different scales, so they get one chart each rather
// than a shared plot: two y-scales on one chart invent a correlation that
// is not in the data.
//
// The row order is computed once, from project count, and reused by all
// three charts. That is what makes them small multiples rather than three
// unrelated charts — a region sits on the same line in each, so the eye
// can read across.
//
// Single series per chart, so each takes one hue and needs no legend —
// the chart's own title says what is plotted. The hue is primary-700
// rather than primary-600, which is the Active status colour; a bar here
// means "how much", not "which state".
// ============================================================

import { useState } from "react";
import type { RegionStat } from "@/lib/data/open-data";

/** Single-series mark colour. Contrast on white is ~5:1, well over the 3:1 mark floor. */
const BAR = "#15803d";
const TRACK = "#f1f0ec";

function fmtCompact(value: number): string {
  if (!value) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
}

function fmtFull(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

interface Measure {
  key: string;
  title: string;
  unit?: string;
  value: (r: RegionStat) => number;
  format: (v: number) => string;
}

const MEASURES: Measure[] = [
  { key: "count", title: "Projects", value: (r) => r.count, format: fmtFull },
  { key: "budget", title: "Total budget", unit: "USD", value: (r) => r.totalBudget, format: fmtCompact },
  // Full figures, not compact: beneficiary counts here are in the
  // hundreds and low thousands, where "1K" and "5K" would flatten 1,200
  // and 4,640 into the same shrug. Compact earns its place on budget.
  { key: "beneficiaries", title: "Beneficiaries", value: (r) => r.beneficiaries, format: fmtFull },
];

/** "Northern Uganda" → "Northern" — the axis says these are regions. */
function shortRegion(region: string): string {
  return region.replace(/\s*Uganda\s*$/i, "").trim() || region;
}

export default function RegionAggregates({ stats }: { stats: RegionStat[] }) {
  const [showTable, setShowTable] = useState(false);

  if (!stats.length) return null;

  // One order for all three charts, so rows line up across them.
  const rows = [...stats].sort((a, b) => b.count - a.count);

  return (
    <div className="mt-5 bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Regional aggregates</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            All published projects per region — the figures shaded on the map&apos;s
            regional view. Not narrowed by the filters above.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          aria-expanded={showTable}
          className="text-xs font-semibold text-primary-700 hover:underline shrink-0"
        >
          {showTable ? "Hide table" : "View as table"}
        </button>
      </div>

      <div className="grid gap-x-8 gap-y-6 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {MEASURES.map((m) => {
          const max = Math.max(...rows.map(m.value), 0);
          return (
            <figure key={m.key} className="m-0">
              <figcaption className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">
                {m.title}
                {m.unit && <span className="ml-1 font-medium normal-case text-gray-400">({m.unit})</span>}
              </figcaption>

              <div className="space-y-2.5">
                {rows.map((r) => {
                  const v = m.value(r);
                  // Zero keeps a hairline so the row still reads as a row.
                  const pct = max > 0 ? Math.max((v / max) * 100, v > 0 ? 2 : 0) : 0;
                  return (
                    <div key={r.region} className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-2">
                      <span className="text-[11px] text-gray-500 truncate" title={r.region}>
                        {shortRegion(r.region)}
                      </span>
                      {/* Track + bar. The bar grows from a square baseline
                          and rounds only at the data end. */}
                      <span className="block h-2.5 rounded-sm" style={{ background: TRACK }}>
                        <span
                          className="block h-2.5 rounded-r-[4px]"
                          style={{ width: `${pct}%`, background: BAR }}
                        />
                      </span>
                      <span className="text-[11px] font-semibold text-gray-700 tabular-nums text-right">
                        {m.format(v)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </figure>
          );
        })}
      </div>

      {/* Table view — the WCAG-clean twin of the charts above. */}
      {showTable && (
        <div className="overflow-x-auto border-t border-gray-100">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Project count, total budget and beneficiaries reached for each region of Uganda.
            </caption>
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50">
                <th scope="col" className="px-4 py-2 font-semibold">Region</th>
                <th scope="col" className="px-4 py-2 font-semibold text-right">Projects</th>
                <th scope="col" className="px-4 py-2 font-semibold text-right">Total budget</th>
                <th scope="col" className="px-4 py-2 font-semibold text-right">Beneficiaries</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.region} className="border-t border-gray-50">
                  <th scope="row" className="px-4 py-2 font-medium text-gray-800 text-left">{r.region}</th>
                  <td className="px-4 py-2 text-right text-gray-700 tabular-nums">{fmtFull(r.count)}</td>
                  <td className="px-4 py-2 text-right text-gray-700 tabular-nums">{fmtCompact(r.totalBudget)}</td>
                  <td className="px-4 py-2 text-right text-gray-700 tabular-nums">
                    {r.beneficiaries ? fmtFull(r.beneficiaries) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
