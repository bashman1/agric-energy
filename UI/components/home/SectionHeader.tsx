"use client";

import Link from "next/link";
import Reveal from "@/components/shared/motion/Reveal";
import { ArrowRightIcon } from "@/components/shared/icons";

interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  href: string;
  linkLabel: string;
  onDark?: boolean;
}

export default function SectionHeader({
  eyebrow,
  title,
  description,
  href,
  linkLabel,
  onDark = false,
}: SectionHeaderProps) {
  return (
    <Reveal className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
      <div>
        <span className={`eyebrow ${onDark ? "on-dark" : ""}`}>{eyebrow}</span>
        <h2
          className={`font-display text-3xl font-semibold tracking-tight mt-3 ${
            onDark ? "text-white" : "text-ink-900"
          }`}
        >
          {title}
        </h2>
        <p className={`mt-2 text-base ${onDark ? "text-ink-300" : "text-ink-500"}`}>
          {description}
        </p>
      </div>
      <Link
        href={href}
        className={`group inline-flex items-center gap-1.5 font-semibold text-sm whitespace-nowrap ${
          onDark
            ? "text-primary-300 hover:text-primary-200"
            : "text-primary-700 hover:text-primary-800"
        }`}
      >
        {linkLabel}
        <ArrowRightIcon className="transition-transform group-hover:translate-x-1" />
      </Link>
    </Reveal>
  );
}
