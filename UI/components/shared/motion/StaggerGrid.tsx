// ============================================================
// StaggerGrid — a grid whose children reveal in sequence.
//
// Applies the given grid classes to itself and wraps each child in a
// <Reveal> with an incrementing delay so cards cascade in. The delay
// step is capped (STEP_CAP) so large grids don't crawl. Not a client
// component itself — it just composes the client <Reveal>.
// ============================================================

import { Children, type ReactNode } from "react";
import Reveal from "./Reveal";

const STEP_MS = 100;
const STEP_CAP = 8; // after 8 items the delay stops growing

interface StaggerGridProps {
  children: ReactNode;
  /** Grid layout classes applied to the wrapper (e.g. "grid grid-cols-3 gap-6"). */
  className?: string;
}

export default function StaggerGrid({ children, className }: StaggerGridProps) {
  return (
    <div className={className}>
      {Children.map(children, (child, i) => (
        <Reveal delay={Math.min(i, STEP_CAP) * STEP_MS}>{child}</Reveal>
      ))}
    </div>
  );
}
