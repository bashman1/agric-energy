interface BadgeProps {
  label: string;
  color?: "green" | "blue" | "yellow" | "gray" | "red" | "purple" | "amber";
  size?: "sm" | "md";
  /** Show a leading status dot — used for project/content status. */
  dot?: boolean;
}

// Calm, low-saturation status palette. Color carries meaning (status),
// never decoration — that's the institutional rule.
const colorMap: Record<string, { chip: string; dot: string }> = {
  green: { chip: "bg-primary-50 text-primary-800 border-primary-200", dot: "bg-primary-500" },
  blue: { chip: "bg-accent-50 text-accent-800 border-accent-200", dot: "bg-accent-500" },
  yellow: { chip: "bg-secondary-50 text-secondary-800 border-secondary-200", dot: "bg-secondary-500" },
  amber: { chip: "bg-secondary-50 text-secondary-800 border-secondary-200", dot: "bg-secondary-500" },
  gray: { chip: "bg-ink-100 text-ink-600 border-ink-200", dot: "bg-ink-400" },
  red: { chip: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" },
  purple: { chip: "bg-purple-50 text-purple-700 border-purple-200", dot: "bg-purple-500" },
};

export default function Badge({
  label,
  color = "gray",
  size = "sm",
  dot = false,
}: BadgeProps) {
  const c = colorMap[color] ?? colorMap.gray;
  const sizeClasses =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${sizeClasses} ${c.chip}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} aria-hidden="true" />}
      {label}
    </span>
  );
}
