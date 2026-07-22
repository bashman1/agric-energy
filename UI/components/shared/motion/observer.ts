// ============================================================
// Shared IntersectionObserver for scroll-reveal / count-up.
//
// One observer instance is reused across every animated element on
// the page (cheaper than one observer per component). Each element
// registers a one-shot callback that fires the first time it enters
// the viewport, after which it is automatically unobserved.
// ============================================================

type RevealCallback = () => void;

const callbacks = new WeakMap<Element, RevealCallback>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return null;
  }
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const cb = callbacks.get(entry.target);
          if (cb) {
            cb();
            callbacks.delete(entry.target);
            observer?.unobserve(entry.target);
          }
        }
      },
      // Trigger once the element is a bit into the viewport, so the reveal
      // plays as the user scrolls to it (more perceptible than firing early).
      { rootMargin: "0px 0px -15% 0px", threshold: 0.15 }
    );
  }
  return observer;
}

/** True when the user has asked the OS to minimise motion. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Fire `cb` once, the first time `el` scrolls into view. Returns an
 * unsubscribe function. If the observer is unavailable (SSR / very old
 * browser), `cb` runs immediately so content is never left hidden.
 */
export function observeOnce(el: Element, cb: RevealCallback): () => void {
  const obs = getObserver();
  if (!obs) {
    cb();
    return () => {};
  }
  callbacks.set(el, cb);
  obs.observe(el);
  return () => {
    callbacks.delete(el);
    obs.unobserve(el);
  };
}
