"use client";
import { useId, useState } from "react";
import EmptyState from "@/components/shared/EmptyState";
import type { AuditEntry } from "@/lib/data/admin";

/** activitylog event names we emit; "" = all. */
const EVENTS = ["created", "updated", "deleted"];

/** Subject types worth filtering by — matches class_basename from the API. */
const SUBJECT_TYPES = [
  "Project", "Technology", "Theme", "Partner", "Resource",
  "Event", "Opportunity", "Policy", "Post", "User",
];

const EVENT_STYLE: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700 border-emerald-200",
  updated: "bg-blue-50 text-blue-700 border-blue-200",
  deleted: "bg-red-50 text-red-700 border-red-200",
};

function formatWhen(at: string | null): string {
  if (!at) return "—";
  const d = new Date(at);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/**
 * The activitylog `changes()` payload is `{attributes: {...}, old: {...}}`.
 * Flatten it into before/after rows so a diff is readable at a glance.
 */
function diffRows(changes: Record<string, unknown>) {
  const after = (changes?.attributes ?? {}) as Record<string, unknown>;
  const before = (changes?.old ?? {}) as Record<string, unknown>;
  const keys = Array.from(new Set([...Object.keys(after), ...Object.keys(before)]));
  return keys.map((key) => ({ key, before: before[key], after: after[key] }));
}

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

interface Props {
  entries: AuditEntry[];
  event: string;
  subjectType: string;
  limit: string;
}

export default function AuditClient({ entries, event, subjectType, limit }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const eventId = useId();
  const subjectId = useId();
  const limitId = useId();

  return (
    <div className="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Trail</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Who changed what, and when. Read-only — entries cannot be edited or removed.
        </p>
      </div>

      {/* ── Filters (GET form so state lives in the URL) ────────── */}
      <form method="GET" className="bg-white rounded-xl border border-gray-200 p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="min-w-40">
            <label htmlFor={eventId} className="block text-xs font-semibold text-gray-600 mb-1">
              Event
            </label>
            <select id={eventId} name="event" defaultValue={event} className="form-input">
              <option value="">All events</option>
              {EVENTS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>

          <div className="min-w-40">
            <label htmlFor={subjectId} className="block text-xs font-semibold text-gray-600 mb-1">
              Record type
            </label>
            <select id={subjectId} name="subjectType" defaultValue={subjectType} className="form-input">
              <option value="">All types</option>
              {SUBJECT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="w-28">
            <label htmlFor={limitId} className="block text-xs font-semibold text-gray-600 mb-1">
              Show
            </label>
            <select id={limitId} name="limit" defaultValue={limit} className="form-input">
              {["50", "100", "250", "500"].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors"
          >
            Apply
          </button>
          {(event || subjectType) && (
            <a
              href="/admin/audit"
              className="px-3 py-2 border border-gray-200 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-50"
            >
              Clear
            </a>
          )}
        </div>
      </form>

      {entries.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No activity recorded"
          message="Nothing matches these filters yet. Content changes appear here as soon as they happen."
        />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Audit trail of content changes, most recent first
            </caption>
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
              <tr>
                <th scope="col" className="text-left font-semibold px-4 py-3">When</th>
                <th scope="col" className="text-left font-semibold px-4 py-3">Who</th>
                <th scope="col" className="text-left font-semibold px-4 py-3">Event</th>
                <th scope="col" className="text-left font-semibold px-4 py-3">Record</th>
                <th scope="col" className="text-right font-semibold px-4 py-3">Changes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => {
                const rows = diffRows(entry.changes ?? {});
                const isOpen = expanded === entry.id;
                return (
                  <tr key={entry.id} className="align-top">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 text-xs">
                      {formatWhen(entry.at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800">
                        {entry.causer ?? "System"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                          EVENT_STYLE[entry.event] ?? "bg-gray-50 text-gray-600 border-gray-200"
                        }`}
                      >
                        {entry.event || entry.description}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-gray-800">{entry.subjectType || "—"}</div>
                      {entry.subjectId !== null && (
                        <div className="text-xs text-gray-400">#{entry.subjectId}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {rows.length === 0 ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setExpanded(isOpen ? null : entry.id)}
                            aria-expanded={isOpen}
                            className="text-xs font-semibold text-primary-700 hover:text-primary-800"
                          >
                            {isOpen ? "Hide" : `${rows.length} field${rows.length === 1 ? "" : "s"}`}
                          </button>
                          {isOpen && (
                            <dl className="mt-2 text-left bg-gray-50 rounded-lg p-3 space-y-1.5">
                              {rows.map(({ key, before, after }) => (
                                <div key={key} className="text-xs">
                                  <dt className="font-semibold text-gray-600">{key}</dt>
                                  <dd className="text-gray-500 break-words">
                                    <span className="line-through text-red-500">
                                      {renderValue(before)}
                                    </span>
                                    <span className="mx-1.5 text-gray-400" aria-hidden="true">→</span>
                                    <span className="text-emerald-700">{renderValue(after)}</span>
                                  </dd>
                                </div>
                              ))}
                            </dl>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
