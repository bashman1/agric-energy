<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * An email address, checked the same way the browser checks it.
 *
 * Laravel's built-in `email` rule delegates to PHP's
 * FILTER_VALIDATE_EMAIL, which accepts `a@b` — no dot, no TLD. So does
 * the browser's own `type="email"`. Both are looser than what the forms
 * enforce, so an address the user could never have typed by hand could
 * still be stored by anything posting straight to the API.
 *
 * Mirrors `isValidEmail` in UI/lib/validation/contact.ts. The two must
 * agree, or a value that passes client-side validation fails on submit
 * with a message the user cannot act on.
 */
class EmailAddress implements ValidationRule
{
    private const PATTERN = '/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/';

    /** The RFC ceiling; anything longer is paste noise. */
    private const MAX_LENGTH = 320;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if ($value === null || $value === '') {
            return; // optionality is expressed with `nullable`
        }

        $trimmed = is_string($value) ? trim($value) : '';

        if ($trimmed === ''
            || strlen($trimmed) > self::MAX_LENGTH
            || ! preg_match(self::PATTERN, $trimmed)) {
            $fail('The :attribute must be a valid address, e.g. name@example.org.');
        }
    }
}
