"use client";

// ============================================================
// Presentational form controls for the partner registration wizard.
// Match the partner-portal card idiom (bg-gray-50 inputs, xs bold
// gray labels) used by login/register — NOT the public .form-input
// system. Value/onChange are string-based for simplicity.
// ============================================================

import { useId, type ReactNode } from "react";

export const inputClass =
  "block w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30";
export const labelClass = "block text-xs font-semibold text-gray-600 mb-1";

function FieldShell({
  label,
  required,
  help,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {help && <p className="mt-1 text-[11px] text-gray-400">{help}</p>}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  help,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  help?: string;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} required={required} help={help} htmlFor={id}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={inputClass}
      />
    </FieldShell>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  required,
  maxLength,
  rows = 4,
  placeholder,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
  help?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} required={required} help={help} htmlFor={id}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        maxLength={maxLength}
        rows={rows}
        placeholder={placeholder}
        className={inputClass}
      />
      {maxLength && (
        <p className="mt-1 text-right text-[11px] text-gray-400">
          {value.length}/{maxLength}
        </p>
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  required,
  placeholder = "Select…",
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
}) {
  const id = useId();
  return (
    <FieldShell label={label} required={required} help={help} htmlFor={id}>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={inputClass}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** Toggle-pill checkbox group backed by a string[] value. */
export function CheckboxGroup({
  label,
  options,
  value,
  onChange,
  required,
  help,
}: {
  label: string;
  options: readonly string[];
  value: string[];
  onChange: (v: string[]) => void;
  required?: boolean;
  help?: string;
}) {
  const toggle = (opt: string) =>
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt]);

  return (
    <fieldset>
      <legend className={labelClass}>
        {label} {required && <span className="text-red-500">*</span>}
      </legend>
      {help && <p className="mb-2 text-[11px] text-gray-400">{help}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const on = value.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              aria-pressed={on}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                on
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-gray-50 text-gray-700 border-gray-200 hover:border-primary-300"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
