// ============================================================
// Shared number formatting helpers.
//
// The Intl-based formatters (fmtNumber / fmtBudget) MUST stay
// server-side only — running Intl on the client can diverge from
// the server render and cause hydration mismatches. They render the
// final display string on the server; the client CountUp component
// receives that finished string as a prop.
//
// groupThousands() is the client-safe counterpart: a deterministic,
// locale-free grouping used for CountUp's intermediate animation
// frames so no Intl runs in the browser.
// ============================================================

/** Full number with thousands separators, e.g. 12345 → "12,345". */
export function fmtNumber(value: number): string {
  return new Intl.NumberFormat("en-GB").format(value);
}

/** Compact budget/currency magnitude, e.g. 1_250_000 → "1.3M"; 0 → "—". */
export function fmtBudget(value: number): string {
  if (!value) return "—";
  return new Intl.NumberFormat("en-GB", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

/**
 * Deterministic compact magnitude with no locale/Intl dependency.
 * Client-safe (used for CountUp's intermediate budget frames). Mirrors
 * the K/M/B style of fmtBudget's Intl output closely enough that the
 * animation lands cleanly on the server-rendered final string.
 * e.g. 1_250_000 → "1.3M", 0 → "—".
 */
export function compactNumber(value: number): string {
  if (!value) return "—";
  const neg = value < 0;
  const n = Math.abs(value);
  const units: [number, string][] = [
    [1e9, "B"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [size, suffix] of units) {
    if (n >= size) {
      const scaled = n / size;
      // One decimal, trimmed (1.0M → 1M), matching Intl compact.
      const str = scaled.toFixed(1).replace(/\.0$/, "");
      return `${neg ? "-" : ""}${str}${suffix}`;
    }
  }
  return `${neg ? "-" : ""}${Math.round(n)}`;
}

/**
 * Deterministic thousands grouping with no locale/Intl dependency.
 * Safe to run on the client (used for CountUp intermediate frames).
 * e.g. 12345 → "12,345", -1000 → "-1,000".
 */
export function groupThousands(value: number): string {
  const n = Math.trunc(value);
  const neg = n < 0;
  const digits = Math.abs(n).toString();
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i > 0 && (digits.length - i) % 3 === 0) out += ",";
    out += digits[i];
  }
  return neg ? `-${out}` : out;
}
