// ============================================================
// Email and telephone validation — one definition, used by every form.
//
// These rules were previously ad hoc: the registration wizard checked
// the login email but not the organisation email, no form checked a
// phone number at all, and several forms relied solely on the browser's
// `type="email"` hint, which does nothing when a value is set
// programmatically and is trivially bypassed.
//
// Both checks are deliberately PERMISSIVE. The job here is to catch
// typos — a missing @, a phone number with four digits — not to decide
// whether an address can receive mail or a line is connected. Anything
// stricter rejects real people: valid addresses can carry '+' tags and
// long TLDs, and Ugandan numbers are written +256…, 0…, with spaces,
// dashes and brackets in every combination.
// ============================================================

/** Local@domain.tld with no whitespace. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Digits, and the punctuation people actually type around them. */
const PHONE_ALLOWED_RE = /^\+?[\d\s().-]+$/;

/** E.164 caps a subscriber number at 15 digits; 7 is the shortest sane one. */
const PHONE_MIN_DIGITS = 7;
const PHONE_MAX_DIGITS = 15;

export function isValidEmail(value: string): boolean {
  const v = value.trim();
  // A 320-char cap is the RFC ceiling; anything longer is paste noise.
  return v.length <= 320 && EMAIL_RE.test(v);
}

export function isValidPhone(value: string): boolean {
  const v = value.trim();
  if (!PHONE_ALLOWED_RE.test(v)) return false;
  const digits = v.replace(/\D/g, "").length;
  return digits >= PHONE_MIN_DIGITS && digits <= PHONE_MAX_DIGITS;
}

interface Options {
  /** Field name as it reads in the message, e.g. "Contact email". */
  label?: string;
  /** Empty is an error when true; otherwise empty passes. */
  required?: boolean;
}

/**
 * Returns an error message, or null when the value is acceptable.
 * Optional fields pass when left blank but are still format-checked
 * once something is typed.
 */
export function validateEmail(
  value: string,
  { label = "Email", required = false }: Options = {}
): string | null {
  const v = value.trim();
  if (!v) return required ? `${label} is required.` : null;
  return isValidEmail(v)
    ? null
    : `${label} must be a valid address, e.g. name@example.org.`;
}

export function validatePhone(
  value: string,
  { label = "Phone number", required = false }: Options = {}
): string | null {
  const v = value.trim();
  if (!v) return required ? `${label} is required.` : null;
  return isValidPhone(v)
    ? null
    : `${label} must be a valid telephone number, e.g. +256 772 123 456.`;
}
