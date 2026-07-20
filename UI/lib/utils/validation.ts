// ============================================================
// Validation Utilities
// ============================================================

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

type AnyObject = Record<string, unknown>;

/**
 * Validate required string fields in an object.
 */
export function validateRequired(
  data: AnyObject,
  fields: string[]
): ValidationResult {
  const errors: Record<string, string> = {};
  for (const field of fields) {
    const val = data[field];
    if (val === undefined || val === null || String(val).trim() === "") {
      errors[field] = `${field} is required`;
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Sanitize a string — trim whitespace, limit length.
 */
export function sanitizeString(val: unknown, maxLength = 5000): string {
  if (typeof val !== "string") return "";
  return val.trim().slice(0, maxLength);
}

/**
 * Ensure a value is a string array.
 */
export function sanitizeStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val.filter((v) => typeof v === "string").map((v) => v.trim());
  }
  return [];
}

/**
 * Ensure a value is boolean.
 */
export function sanitizeBoolean(val: unknown, defaultVal = false): boolean {
  if (typeof val === "boolean") return val;
  if (val === "true" || val === 1) return true;
  if (val === "false" || val === 0) return false;
  return defaultVal;
}
