"use client";

import Link from "next/link";
import { useState } from "react";

interface SliderPartner {
    id: string;
    slug: string;
    name: string;
    logo: string;
}

export default function PartnersSlider({ partners }: { partners: SliderPartner[] }) {
    const [paused, setPaused] = useState(false);
    if (!partners.length) return null;

    // Triplicate so the loop is always seamless regardless of how many partners there are
    const track = [...partners, ...partners, ...partners];

    return (
        <section className="py-16 bg-white border-t border-gray-100 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center mb-10">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
                    Collaborating Partners
                </h3>
            </div>

            {/* Marquee wrapper */}
            <div
                role="presentation"
                className="relative"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
                onFocus={() => setPaused(true)}
                onBlur={() => setPaused(false)}
            >
                {/* Edge fade-outs */}
                <div className="absolute inset-y-0 left-0 w-16 sm:w-28 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-y-0 right-0 w-16 sm:w-28 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

                {/* Scrolling track */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2rem",            /* 32 px gap between items */
                        width: "max-content",
                        animation: "partners-marquee 32s linear infinite",
                        animationPlayState: paused ? "paused" : "running",
                    }}
                >
                    {track.map((p, i) => (
                        <Link
                            key={`${p.id}-${i}`}
                            href={`/partners/${p.slug}`}
                            /*
                             * Item sizing:
                             *  mobile  (<640 px)  → 2 visible: w ≈ 50vw - 1.5rem gap = ~172 px at 375 px screen
                             *  sm      (≥640 px)  → 3 visible: w ≈ 33vw - 1.5rem     = ~195 px at 640 px
                             *  lg      (≥1024 px) → 4 visible: w ≈ 25vw - 1.5rem     = ~240 px at 1024 px
                             *  xl      (≥1280 px) → 4 visible, a little more padding
                             *
                             *  We use fixed Tailwind widths calibrated for these breakpoints.
                             */
                            className="shrink-0 w-[42vw] sm:w-[28vw] lg:w-[20vw] xl:w-64 h-16 flex items-center justify-center group"
                            tabIndex={i >= partners.length ? -1 : 0}
                            aria-hidden={i >= partners.length ? "true" : undefined}
                        >
                            {p.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={p.logo}
                                    alt={p.name}
                                    draggable={false}
                                    className="max-h-full max-w-full object-contain opacity-50 grayscale group-hover:opacity-100 group-hover:grayscale-0 transition-all duration-300 select-none"
                                />
                            ) : (
                                <span className="text-base font-extrabold text-gray-400 tracking-tight text-center px-2 group-hover:text-gray-900 transition-colors">
                                    {p.name}
                                </span>
                            )}
                        </Link>
                    ))}
                </div>
            </div>

            {/* View all link */}
            <div className="text-center mt-8">
                <Link
                    href="/partners"
                    className="text-sm font-semibold text-primary-600 hover:text-primary-800 transition-colors border border-primary-200 hover:border-primary-400 px-5 py-2.5 rounded-lg"
                >
                    View all partners →
                </Link>
            </div>

            {/* Keyframe — translateX(-33.33%) because we have 3× the original list */}
            <style>{`
        @keyframes partners-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="partners-marquee"] { animation: none !important; }
        }
      `}</style>
        </section>
    );
}
