"use client";

// ============================================================
// Read a submission before deciding on it.
//
// Both sign-off gates had the same hole: a queue row carried a title, an
// author and two buttons, and no way to see the thing being approved. At the
// organisation gate that meant endorsing a colleague's work to NREP sight
// unseen; at the platform gate it meant publishing to the national site the
// same way. Neither is a review.
//
// Deliberately generic over the nine content types rather than nine bespoke
// previews: a reviewer needs to read the fields, and a definition list of
// every populated field does that for any type, including ones added later.
//
// Two shapes, because there are two things to review:
//   • a submission — the whole record, as it would be published;
//   • a revision   — only the fields the edit touches, each as before → after,
//     since the live record is unchanged until approval and so tells you
//     nothing about what is being proposed.
// ============================================================

import type { ReactNode } from "react";

/** Bookkeeping columns: real to the database, noise to a reviewer. */
const HIDDEN = new Set([
  "id",
  "slug",
  "createdAt",
  "updatedAt",
  "createdBy",
  "workflowStatus",
  "published",
  "featured",
  "reviewedAt",
  "reviewNotes",
  "isMine",
  "pendingEdit",
]);

/** "districtCoverage" → "District coverage". */
function humanise(field: string): string {
  const spaced = field
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function isEmpty(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    v === "" ||
    (Array.isArray(v) && v.length === 0) ||
    (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0)
  );
}

/**
 * Render one value readably. Arrays of scalars become chips; objects and
 * arrays of objects fall back to formatted JSON rather than "[object Object]",
 * which is worse than useless in a review.
 */
function Value({ value }: { value: unknown }): ReactNode {
  if (isEmpty(value)) {
    return <span className="text-ink-300 italic">Not set</span>;
  }

  if (typeof value === "boolean") {
    return <span className="text-ink-700">{value ? "Yes" : "No"}</span>;
  }

  if (Array.isArray(value)) {
    const scalars = value.filter((v) => typeof v === "string" || typeof v === "number");
    if (scalars.length === value.length) {
      return (
        <span className="flex flex-wrap gap-1">
          {scalars.map((v, i) => (
            <span
              key={`${String(v)}-${i}`}
              className="text-[11px] px-1.5 py-0.5 rounded bg-ink-50 border border-ink-100 text-ink-600"
            >
              {String(v)}
            </span>
          ))}
        </span>
      );
    }
    return (
      <pre className="text-[11px] bg-ink-50 border border-ink-100 rounded p-2 overflow-x-auto text-ink-600">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  if (typeof value === "object") {
    return (
      <pre className="text-[11px] bg-ink-50 border border-ink-100 rounded p-2 overflow-x-auto text-ink-600">
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }

  const text = String(value);

  // An image field is worth seeing rather than reading as a path.
  if (/^(https?:\/\/|\/)\S+\.(png|jpe?g|webp|gif|svg)$/i.test(text)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={text}
        alt=""
        className="max-h-28 rounded border border-ink-100 bg-white"
      />
    );
  }

  if (/^https?:\/\//i.test(text)) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary-700 hover:underline break-all"
      >
        {text}
      </a>
    );
  }

  return <span className="text-ink-700 whitespace-pre-wrap break-words">{text}</span>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 py-2 border-b border-ink-100 last:border-0">
      <dt className="text-xs font-semibold text-ink-500">{label}</dt>
      <dd className="text-sm min-w-0">{children}</dd>
    </div>
  );
}

/** The whole record, as it would be published. */
export function RecordFields({ record }: { record: Record<string, unknown> }) {
  const fields = Object.entries(record).filter(
    ([k, v]) => !HIDDEN.has(k) && !isEmpty(v)
  );

  if (fields.length === 0) {
    return <p className="text-sm text-ink-400 py-3">This record has no content to show.</p>;
  }

  return (
    <dl className="mt-1">
      {fields.map(([field, value]) => (
        <Row key={field} label={humanise(field)}>
          <Value value={value} />
        </Row>
      ))}
    </dl>
  );
}

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

/** Only what an edit would change, each as before → after. */
export function FieldChanges({ changes }: { changes: FieldChange[] }) {
  const shown = changes.filter((c) => !HIDDEN.has(c.field));

  if (shown.length === 0) {
    return (
      <p className="text-sm text-ink-400 py-3">
        This edit changes nothing a reviewer needs to see.
      </p>
    );
  }

  return (
    <dl className="mt-1">
      {shown.map((c) => (
        <Row key={c.field} label={humanise(c.field)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="rounded border border-red-100 bg-red-50/50 p-2 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-red-500 mb-1">
                Currently live
              </p>
              <Value value={c.before} />
            </div>
            <div className="rounded border border-green-100 bg-green-50/50 p-2 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-green-600 mb-1">
                Proposed
              </p>
              <Value value={c.after} />
            </div>
          </div>
        </Row>
      ))}
    </dl>
  );
}
