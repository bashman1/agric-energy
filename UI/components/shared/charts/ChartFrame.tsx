// ============================================================
// ChartFrame — shared shell for a chart: eyebrow + serif title +
// optional caption, wrapping any chart body. Server component.
// ============================================================

import type { ReactNode } from "react";

interface ChartFrameProps {
  eyebrow?: string;
  title: string;
  caption?: string;
  children: ReactNode;
  className?: string;
}

export default function ChartFrame({
  eyebrow,
  title,
  caption,
  children,
  className,
}: ChartFrameProps) {
  return (
    <figure className={className}>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <div className="font-display text-lg font-semibold text-ink-900 mt-2 mb-4">
        {title}
      </div>
      {children}
      {caption && (
        <figcaption className="mt-4 text-xs text-ink-500">{caption}</figcaption>
      )}
    </figure>
  );
}
