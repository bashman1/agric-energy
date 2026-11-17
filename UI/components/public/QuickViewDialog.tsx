"use client";

// A short preview of a related record (technology, theme) opened from
// another detail page, so a visitor can read the essentials without
// leaving. The full record is one link away at the bottom.
//
// Built on the native <dialog> element: showModal() gives us the top
// layer, Escape-to-close, inert background and focus handling for free.

import { useEffect, useRef } from "react";
import Link from "next/link";
import { mediaUrl } from "@/lib/utils/mediaUrl";

export interface QuickViewSection {
  title: string;
  /** Rendered as a bulleted list when an array, as a paragraph when a string. */
  body: string | string[];
}

export interface QuickViewItem {
  /** Small label above the title, e.g. "Technology" or the category. */
  eyebrow?: string;
  title: string;
  icon?: string;
  image?: string;
  summary?: string;
  sections: QuickViewSection[];
  href: string;
  linkLabel: string;
}

export default function QuickViewDialog({
  item,
  onClose,
}: {
  item: QuickViewItem | null;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (item && !dialog.open) dialog.showModal();
    if (!item && dialog.open) dialog.close();
  }, [item]);

  // Lock page scroll while open.
  useEffect(() => {
    if (!item) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [item]);

  const sections = (item?.sections ?? []).filter((s) =>
    Array.isArray(s.body) ? s.body.length > 0 : Boolean(s.body?.trim())
  );

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      // Clicking the backdrop lands on the <dialog> itself, not its content.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-labelledby="quick-view-title"
      className="m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[85vh] rounded-2xl p-0 bg-white text-gray-800 shadow-2xl backdrop:bg-black/50"
    >
      {item && (
        <div className="flex flex-col max-h-[85vh]">
          {item.image && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaUrl(item.image)}
              alt=""
              className="w-full h-40 sm:h-48 object-cover shrink-0"
            />
          )}

          <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3 border-b border-gray-100 shrink-0">
            <div className="min-w-0">
              {item.eyebrow && (
                <div className="text-xs font-semibold text-primary-600 uppercase tracking-wide mb-1">
                  {item.eyebrow}
                </div>
              )}
              <h2 id="quick-view-title" className="text-xl font-bold text-gray-900 leading-snug">
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-5 space-y-5 text-sm">
            {item.summary && <p className="text-gray-700 leading-relaxed">{item.summary}</p>}
            {sections.map((s) => (
              <div key={s.title}>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                {Array.isArray(s.body) ? (
                  <ul className="space-y-1.5 text-gray-600">
                    {s.body.map((line) => (
                      <li key={line} className="flex items-start gap-2">
                        <span className="text-primary-600 mt-0.5 shrink-0">✓</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600 leading-relaxed whitespace-pre-line line-clamp-[12]">{s.body}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Close
            </button>
            <Link
              href={item.href}
              className="px-4 py-2 text-sm font-semibold text-white bg-primary-700 rounded-lg hover:bg-primary-800 transition-colors"
            >
              {item.linkLabel} →
            </Link>
          </div>
        </div>
      )}
    </dialog>
  );
}
