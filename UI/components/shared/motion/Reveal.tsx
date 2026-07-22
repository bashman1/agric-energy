"use client";

// ============================================================
// Reveal — fades + rises its children into view on first scroll.
//
// House motion idiom: CSS-driven (the [data-reveal] / [data-visible]
// rules live in globals.css); JS only flips `data-visible` via the shared
// observer. Content starts hidden by CSS and is revealed once in view — a
// <noscript> rule in the layout un-hides it for no-JS users, and the
// prefers-reduced-motion media query shows it with no animation. State
// starts hidden on both server and client, so hydration matches exactly.
// ============================================================

import {
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { observeOnce, prefersReducedMotion } from "./observer";

interface RevealProps {
  children: ReactNode;
  /** Element to render. Defaults to a div. */
  as?: ElementType;
  /** Stagger delay in milliseconds. */
  delay?: number;
  className?: string;
}

export default function Reveal({
  children,
  as,
  delay = 0,
  className,
}: RevealProps) {
  const Tag = as ?? "div";
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion: the CSS media query already shows content; skip observing.
    if (prefersReducedMotion()) return;
    const unobserve = observeOnce(el, () => setVisible(true));
    return unobserve;
  }, []);

  return (
    <Tag
      ref={ref}
      data-reveal=""
      data-visible={visible ? "" : undefined}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={className}
    >
      {children}
    </Tag>
  );
}
