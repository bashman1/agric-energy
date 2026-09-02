// ============================================================
// Card accents — the colour identity of a card header.
//
// Project, technology, and theme cards each open with a saturated
// gradient band carrying an icon and the record's name. The colour is
// *derived from the data*, not decorative: a reader scanning a grid can
// tell Solar Energy from Biogas, or Northern from Western Uganda, before
// reading a word. That mapping lives here so all three cards — and any
// future surface that needs the same cue — stay in sync.
//
// Gradient classes are written out in full: Tailwind scans source text,
// so an interpolated class name (`from-${c}-600`) would never be built.
//
// Palette note: `ink` and `gray` invert under the dark theme (see
// globals.css), so accents deliberately use fixed hues — amber, sky,
// violet, slate — which read the same in both themes against white text.
// ============================================================

export interface CardAccent {
  /** Full gradient utility string for the header band. */
  gradient: string;
  /** Emoji mark shown at the head of the band. */
  icon: string;
}

const FALLBACK: CardAccent = {
  gradient: "bg-linear-to-br from-primary-600 to-emerald-700",
  icon: "⚡",
};

// ─── Technologies — keyed on Technology.category ──────────────
const TECH_ACCENTS: Record<string, CardAccent> = {
  "Solar Energy": { gradient: "bg-linear-to-br from-amber-500 to-orange-600", icon: "☀️" },
  "Biogas / Biomass": { gradient: "bg-linear-to-br from-green-600 to-emerald-700", icon: "🌿" },
  "Post-Harvest & Processing": { gradient: "bg-linear-to-br from-purple-600 to-violet-700", icon: "🌾" },
  "Irrigation Systems": { gradient: "bg-linear-to-br from-blue-600 to-cyan-700", icon: "💧" },
  "Cold Chain & Storage": { gradient: "bg-linear-to-br from-sky-500 to-blue-600", icon: "❄️" },
};

// ─── Projects — keyed on Project.region ───────────────────────
const PROJECT_ACCENTS: Record<string, CardAccent> = {
  "Northern Uganda": { gradient: "bg-linear-to-br from-emerald-700 to-teal-800", icon: "🌿" },
  "Eastern Uganda": { gradient: "bg-linear-to-br from-sky-700 to-blue-800", icon: "☀️" },
  "Central Uganda": { gradient: "bg-linear-to-br from-primary-700 to-green-800", icon: "🏙️" },
  "Western Uganda": { gradient: "bg-linear-to-br from-violet-700 to-purple-800", icon: "🌄" },
  National: { gradient: "bg-linear-to-br from-slate-700 to-slate-900", icon: "🇺🇬" },
};

// ─── Themes — keyed on Theme.slug ─────────────────────────────
const THEME_ACCENTS: Record<string, string> = {
  "technologies-and-innovations": "bg-linear-to-br from-rose-600 to-pink-700",
  "research-and-evidence": "bg-linear-to-br from-violet-600 to-purple-700",
  "gender-youth-inclusion": "bg-linear-to-br from-indigo-600 to-violet-700",
  "climate-resilience": "bg-linear-to-br from-amber-600 to-orange-700",
  "financing-and-business-models": "bg-linear-to-br from-cyan-600 to-sky-700",
  "productive-use-of-energy": "bg-linear-to-br from-emerald-600 to-teal-700",
  "value-chain-applications": "bg-linear-to-br from-sky-600 to-blue-700",
  "policy-and-regulation": "bg-linear-to-br from-teal-600 to-emerald-700",
};

/**
 * Ordered palette used when a record's key is not in the maps above —
 * new themes added through the admin still get a stable, distinct band
 * rather than falling back to a single house green.
 */
const ROTATION = [
  "bg-linear-to-br from-emerald-600 to-teal-700",
  "bg-linear-to-br from-cyan-600 to-sky-700",
  "bg-linear-to-br from-amber-600 to-orange-700",
  "bg-linear-to-br from-violet-600 to-purple-700",
  "bg-linear-to-br from-rose-600 to-pink-700",
  "bg-linear-to-br from-indigo-600 to-violet-700",
];

/** Stable index from a string, so a slug always lands on the same colour. */
function rotationFor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return ROTATION[hash % ROTATION.length];
}

export function techAccent(category: string): CardAccent {
  return TECH_ACCENTS[category] ?? FALLBACK;
}

export function projectAccent(region: string): CardAccent {
  if (PROJECT_ACCENTS[region]) return PROJECT_ACCENTS[region];
  // Tolerate "national" / "National Coverage" style values from imports.
  if (region?.toLowerCase().startsWith("national")) return PROJECT_ACCENTS.National;
  return FALLBACK;
}

export function themeAccent(slug: string, icon?: string): CardAccent {
  return {
    gradient: THEME_ACCENTS[slug] ?? rotationFor(slug),
    icon: icon || "📚",
  };
}
