import Link from "next/link";
import type { Metadata } from "next";
import { getAuthToken, getSession } from "@/lib/auth/session";
import { getMyContent } from "@/lib/data/partner-portal";

export const metadata: Metadata = { title: "Dashboard" };

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  in_review: "bg-blue-50 text-blue-700 border border-blue-200",
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
  archived: "bg-gray-100 text-gray-500",
};

const SUBMIT_TYPES: [string, string, string][] = [
  ["projects", "Project", "🏗️"],
  ["technologies", "Technology", "⚡"],
  ["resources", "Resource", "📄"],
  ["events", "Event", "📅"],
  ["opportunities", "Opportunity", "💰"],
];

export default async function PartnerDashboard() {
  const token = await getAuthToken();
  const session = await getSession();
  const items = await getMyContent(token);

  const counts = {
    pending: items.filter((i) => ["pending", "in_review"].includes(i.workflowStatus)).length,
    published: items.filter((i) => i.published).length,
    rejected: items.filter((i) => i.workflowStatus === "rejected").length,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{session.name ? `, ${session.name}` : ""}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Submit content and track its review status. Submissions are published once
          approved by an NREP administrator.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-3 gap-3 mb-6 max-w-md">
        <Stat label="Awaiting review" value={counts.pending} tone="amber" />
        <Stat label="Published" value={counts.published} tone="emerald" />
        <Stat label="Needs changes" value={counts.rejected} tone="red" />
      </div>

      {/* Submit new content */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h2 className="font-bold text-gray-900 text-sm mb-3">Submit new content</h2>
        <div className="flex flex-wrap gap-2">
          {SUBMIT_TYPES.map(([type, label, icon]) => (
            <Link
              key={type}
              href={`/partner/submit/${type}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg hover:border-primary-300 hover:text-primary-700 transition-colors"
            >
              <span>{icon}</span> {label}
            </Link>
          ))}
        </div>
      </div>

      {/* My submissions */}
      <h2 className="font-bold text-gray-900 text-sm mb-3">My submissions</h2>
      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
          You haven&rsquo;t submitted anything yet. Use the buttons above to get started.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {items.map((i) => (
            <div key={`${i.type}/${i.slug}`} className="px-4 py-3.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                  {i.type}
                </span>
                <span className="font-semibold text-gray-800 text-sm">{i.title}</span>
                <span
                  className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    STATUS_STYLE[i.workflowStatus] ?? "bg-gray-100 text-gray-600"
                  }`}
                >
                  {i.workflowStatus.replace("_", " ")}
                </span>
              </div>
              {i.workflowStatus === "rejected" && i.reviewNotes && (
                <p className="text-xs text-red-600 mt-1.5">
                  <strong>Reviewer notes:</strong> {i.reviewNotes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "emerald" | "red";
}) {
  const tones = {
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    red: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium">{label}</div>
    </div>
  );
}
