// Query-driven parts of /newsletter. Laravel's confirm/unsubscribe
// endpoints redirect back here with ?status=, which a static export can
// only read in the browser.
"use client";

import { useSearchParams } from "next/navigation";
import NewsletterSignup from "@/components/public/NewsletterSignup";

/** Confirmation states the API redirects back to via ?status=. */
const STATUS_MESSAGES: Record<
  string,
  { icon: string; title: string; body: string; tone: "success" | "info" | "error" }
> = {
  confirmed: {
    icon: "✅",
    title: "Subscription confirmed",
    body: "Thank you — your email address is verified and you are now on the Agri-Energy Desk newsletter list. Your first issue will arrive with the next monthly send.",
    tone: "success",
  },
  unsubscribed: {
    icon: "👋",
    title: "You have been unsubscribed",
    body: "Your email address has been removed from the newsletter list and you will not receive further issues. You are welcome to subscribe again at any time using the form below.",
    tone: "info",
  },
  invalid: {
    icon: "⚠️",
    title: "That link is no longer valid",
    body: "The confirmation or unsubscribe link has expired or has already been used. Please subscribe again below, or contact us if you need help.",
    tone: "error",
  },
};

const TONE_CLASSES: Record<string, string> = {
  success: "bg-emerald-50 border-emerald-200 text-emerald-800",
  info: "bg-blue-50 border-blue-200 text-blue-800",
  error: "bg-amber-50 border-amber-200 text-amber-800",
};

export default function NewsletterStatus() {
  const status = STATUS_MESSAGES[useSearchParams().get("status") ?? ""];

  return (
    <>
      {status && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-8 rounded-2xl border p-6 ${TONE_CLASSES[status.tone]}`}
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl shrink-0" aria-hidden="true">
              {status.icon}
            </span>
            <div>
              <h2 className="text-lg font-bold mb-1">{status.title}</h2>
              <p className="text-sm leading-relaxed">{status.body}</p>
            </div>
          </div>
        </div>
      )}
      <NewsletterSignup
        variant="inline"
        heading={
          status === STATUS_MESSAGES.unsubscribed
            ? "Changed your mind? Subscribe again"
            : "Subscribe to the newsletter"
        }
      />
    </>
  );
}
