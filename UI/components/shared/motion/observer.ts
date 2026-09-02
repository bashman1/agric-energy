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
      // Fire as soon as an edge enters the viewport. The old -15%/0.15
      // combination held content hidden until it was well on screen, which
      // read as the page loading slowly rather than as deliberate motion.
      { rootMargin: "0px 0px -2% 0px", threshold: 0.01 }
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
