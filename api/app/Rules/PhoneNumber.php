<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * A telephone number, checked the same way the browser checks it.
 *
 * Deliberately permissive, and deliberately identical to
 * `isValidPhone` in UI/lib/validation/contact.ts: the two must agree, or
 * a form that passes client-side validation fails on submit with a
 * message the user cannot act on.
 *
 * The job is catching typos — four digits, a stray letter — not deciding
 * whether a line is connected. Ugandan numbers get written +256…, 0…,
 * with spaces, dashes and brackets in every combination, and all of
 * those are accepted. E.164 caps a number at 15 digits; 7 is the
 * shortest sane one.
 */
class PhoneNumber implements ValidationRule
{
    private const ALLOWED = '/^\+?[\d\s().-]+$/';

    private const MIN_DIGITS = 7;

    private const MAX_DIGITS = 15;

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        // Optionality is expressed with `nullable`, as for any other rule.
        if ($value === null || $value === '') {
            return;
        }

        if (! is_string($value)) {
            $fail('The :attribute must be a valid telephone number.');

            return;
        }

        $trimmed = trim($value);
        $digits = strlen(preg_replace('/\D/', '', $trimmed));

        if (! preg_match(self::ALLOWED, $trimmed)
            || $digits < self::MIN_DIGITS
            || $digits > self::MAX_DIGITS) {
            $fail('The :attribute must be a valid telephone number, e.g. +256 772 123 456.');
        }
    }
}
