"use client";
// ============================================================
// NewsletterSignup — double opt-in subscription form.
// Posts to the Next proxy route /api/newsletter/subscribe,
// which forwards to POST /api/v1/newsletter/subscribe.
// Two visual variants: "footer" (dark) and "inline" (card).
// ============================================================
import { useId, useState } from "react";
import { ApiError, apiSend } from "@/lib/api/client";

type FormState = "idle" | "loading" | "success" | "error";

interface NewsletterSignupProps {
  variant?: "footer" | "inline";
  heading?: string;
  description?: string;
  className?: string;
}

export default function NewsletterSignup({
  variant = "inline",
  heading = "Subscribe to the Agri-Energy newsletter",
  description = "Monthly updates on projects, technologies, funding calls and events across Uganda's agri-energy sector.",
  className = "",
}: NewsletterSignupProps) {
  const uid = useId();
  const emailId = `${uid}-email`;
  const nameId = `${uid}-name`;

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [message, setMessage] = useState("");

  const isFooter = variant === "footer";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("loading");
    setMessage("");
    try {
      const data =
        (await apiSend<{ message?: string }>("POST", "newsletter/subscribe", {
          email,
          name,
        })) ?? {};
      setState("success");
      setMessage(
        data.message ??
          "Almost there — check your inbox for a confirmation link to complete your subscription."
      );
      setEmail("");
      setName("");
    } catch (err) {
      setState("error");
      // apiSend throws ApiError with the API's own message (duplicate
      // address, throttled, invalid); anything else is a transport failure.
      setMessage(
        err instanceof ApiError
          ? err.message
          : "Network error — please check your connection and try again."
      );
    }
  };

  const labelClass = isFooter
    ? "block text-xs font-semibold text-gray-300 mb-1"
    : "block text-xs font-semibold text-gray-600 mb-1";

  const inputClass = isFooter
    ? "w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
    : "form-input";

  const buttonClass = isFooter
    ? "w-full py-2.5 bg-primary-600 text-white text-sm font-bold rounded-lg hover:bg-primary-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    : "w-full py-3 bg-primary-700 text-white font-bold rounded-xl hover:bg-primary-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed";

  return (
    <section
      className={
        isFooter
          ? className
          : `bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-card ${className}`
      }
      aria-labelledby={`${uid}-heading`}
    >
      <h2
        id={`${uid}-heading`}
        className={
          isFooter
            ? "text-sm font-bold text-white uppercase tracking-wider mb-2"
            : "text-xl font-bold text-gray-900 mb-1"
        }
      >
        {heading}
      </h2>
      {description && (
        <p
          className={
            isFooter
              ? "text-xs text-gray-400 leading-relaxed mb-4"
              : "text-sm text-gray-500 mb-6"
          }
        >
          {description}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className={isFooter ? "space-y-3" : "space-y-4"}
      >
        <div>
          <label htmlFor={nameId} className={labelClass}>
            Name <span className="font-normal opacity-70">(optional)</span>
          </label>
          <input
            id={nameId}
            name="name"
            type="text"
            autoComplete="name"
            className={inputClass}
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={state === "loading"}
          />
        </div>

        <div>
          <label htmlFor={emailId} className={labelClass}>
            Email address <span aria-hidden="true">*</span>
            <span className="sr-only">(required)</span>
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClass}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={state === "loading"}
            aria-describedby={`${uid}-status`}
          />
        </div>

        <button type="submit" disabled={state === "loading"} className={buttonClass}>
          {state === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>

      <p
        id={`${uid}-status`}
        role="status"
        aria-live="polite"
        className={
          message
            ? state === "success"
              ? isFooter
                ? "mt-3 text-xs text-emerald-300"
                : "mt-4 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700"
              : isFooter
                ? "mt-3 text-xs text-red-300"
                : "mt-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
            : "sr-only"
        }
      >
        {message}
      </p>

      <p
        className={
          isFooter
            ? "mt-3 text-[11px] text-gray-500 leading-relaxed"
            : "mt-4 text-xs text-gray-400 leading-relaxed"
        }
      >
        We use double opt-in — you will receive a confirmation email. You can
        unsubscribe at any time using the link in every newsletter.
      </p>
    </section>
  );
}
