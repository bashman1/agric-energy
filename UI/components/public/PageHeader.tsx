// ============================================================
// PageHeader — the shared institutional hero band for inner pages.
//
// Replaces the drifted per-page header sections (raw max-w-7xl /
// text-green-200 / font-extrabold) with one tokenised band: dark
// primary field, on-dark eyebrow, serif display title, lead paragraph.
// Content is wrapped in <Reveal> so it fades in like the homepage.
// Optional children render below the lead (e.g. tabs, actions).
// ============================================================

import type { ReactNode } from "react";
import Reveal from "@/components/shared/motion/Reveal";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  lead?: string;
  children?: ReactNode;
}

export default function PageHeader({
  eyebrow = "Platform",
  title,
  lead,
  children,
}: PageHeaderProps) {
  return (
    <section className="hero-band relative bg-primary-900 text-white overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(60% 90% at 12% 0%, #166534 0%, transparent 60%), radial-gradient(50% 70% at 100% 10%, #0f766e 0%, transparent 55%)",
        }}
      />
      <div className="container-page relative py-14 lg:py-20">
        <Reveal className="max-w-3xl">
          <span className="eyebrow on-dark">{eyebrow}</span>
          <h1 className="font-display text-4xl lg:text-5xl font-semibold tracking-tight mt-4">
            {title}
          </h1>
          {lead && (
            <p className="mt-4 text-lg text-primary-50/90 leading-relaxed">
              {lead}
            </p>
          )}
          {children}
        </Reveal>
      </div>
    </section>
  );
}
