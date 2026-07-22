"use client";

// ============================================================
// CountUp — animates a number from 0 to its target on first scroll.
//
// Hydration contract: the server (and first client paint) render the
// pre-formatted final string passed as `formatted`, so SSR and hydration
// match exactly — no mismatch, and no-JS users see the real value. Only
// after mount + first-in-view does the rAF tween run, formatting each
// frame with the client-safe `format` fn (never Intl). Reduced motion or
// missing observer → the final string simply stays.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { compactNumber, groupThousands } from "@/lib/utils/format";
import { observeOnce, prefersReducedMotion } from "./observer";

interface CountUpProps {
  /** Target value to count to. */
  value: number;
  /** Canonical final display string (rendered on the server). */
  formatted: string;
  /**
   * Format intermediate frames compactly (e.g. 5.1M) instead of grouped
   * thousands. A boolean (not a function) so it can cross the
   * server→client boundary. Match it to how `formatted` was produced.
   */
  compact?: boolean;
  /** Tween duration in ms. */
  duration?: number;
  className?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export default function CountUp({
  value,
  formatted,
  compact = false,
  duration = 2000,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(formatted);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion() || value <= 0) return;

    const format = compact ? compactNumber : groupThousands;
    let raf = 0;
    let start = 0;

    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / duration, 1);
      const current = Math.round(value * easeOutCubic(progress));
      // Land exactly on the canonical string to avoid an end-of-tween jump.
      setDisplay(progress >= 1 ? formatted : format(current));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    const unobserve = observeOnce(el, () => {
      raf = requestAnimationFrame(step);
    });

    return () => {
      unobserve();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, formatted, compact, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
