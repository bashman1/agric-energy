// Renders sanitised editor HTML. The one place `dangerouslySetInnerHTML`
// is allowed to meet a rich-text field — everything goes through
// sanitizeHtml first.
"use client";

import { useSyncExternalStore } from "react";
import { sanitizeHtml, hasHtmlContent, isPlainText } from "@/lib/html/sanitize";

/** Never emits, so the value only ever flips once: server false → client true. */
const noopSubscribe = () => () => {};

export default function RichText({
  html,
  className = "",
}: {
  html: string | null | undefined;
  className?: string;
}) {
  // Sanitising needs a DOM, so it cannot run during the server pass — and
  // React deliberately does NOT reconcile `dangerouslySetInnerHTML` while
  // hydrating, so markup skipped on the server would stay missing forever.
  // Flipping a state flag after mount forces a real re-render, which is the
  // pass that actually writes the HTML in. Rendering the same <div> either
  // way keeps the trees matching so hydration stays quiet.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

  if (!hasHtmlContent(html)) return null;

  // Records written before these fields became rich text hold plain prose
  // with real newlines. Handing that to innerHTML would run every paragraph
  // together, so it keeps the whitespace-pre-line treatment it always had.
  // No sanitising needed, so this path renders on the server too.
  if (isPlainText(html!)) {
    return <div className={`${className} whitespace-pre-line`}>{html}</div>;
  }

  return (
    <div
      className={`rich-text ${className}`}
      dangerouslySetInnerHTML={{ __html: mounted ? sanitizeHtml(html) : "" }}
    />
  );
}
