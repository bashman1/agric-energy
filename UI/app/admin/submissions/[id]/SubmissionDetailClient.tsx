"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Submission, SubmissionStatus } from "@/lib/types";

const statusOptions: SubmissionStatus[] = ["new", "read", "responded", "archived"];

const statusColors: Record<SubmissionStatus, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  read: "bg-gray-50 text-gray-600 border-gray-200",
  responded: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-orange-50 text-orange-600 border-orange-200",
};

const emailStatusIcon: Record<string, { icon: string; label: string; color: string }> = {
  sent: { icon: "✓", label: "Email Sent", color: "text-emerald-600" },
  failed: { icon: "✗", label: "Email Failed", color: "text-red-500" },
  not_sent: { icon: "⏸", label: "Not Sent (No SMTP configured)", color: "text-gray-400" },
};

export default function SubmissionDetailClient({ submission: initial }: { submission: Submission }) {
  const router = useRouter();
  const [submission, setSubmission] = useState<Submission>(initial);
  const [adminNotes, setAdminNotes] = useState(initial.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const update = async (patch: Partial<Pick<Submission, "status" | "adminNotes">>) => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        const updated = await res.json();
        setSubmission(updated);
        setMsg("Saved");
        router.refresh();
      } else {
        setMsg("Failed to save");
      }
    } catch {
      setMsg("Network error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this submission permanently?")) return;
    await fetch(`/api/submissions/${submission.id}`, { method: "DELETE" });
    router.push("/admin/submissions");
    router.refresh();
  };

  const ec = emailStatusIcon[submission.emailStatus] ?? emailStatusIcon.not_sent;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{submission.subject}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            From <strong>{submission.name}</strong>
            {submission.organisation && ` · ${submission.organisation}`}
            {" · "}<a href={`mailto:${submission.email}`} className="text-primary-600 hover:underline">{submission.email}</a>
          </p>
        </div>
        <button
          onClick={handleDelete}
          className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          Delete
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main — message */}
        <div className="lg:col-span-2 space-y-4">
          {/* Submission type + dates */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-wrap gap-4 text-sm">
            <div>
              <div className="text-xs text-gray-500 mb-0.5 uppercase tracking-wide">Type</div>
              <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">{submission.submissionType}</span>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5 uppercase tracking-wide">Submitted</div>
              <div className="text-gray-800">{new Date(submission.submittedAt).toLocaleString("en-UG", { timeZone: "Africa/Kampala" })}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5 uppercase tracking-wide">Last Updated</div>
              <div className="text-gray-800">{new Date(submission.updatedAt).toLocaleString("en-UG", { timeZone: "Africa/Kampala" })}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-0.5 uppercase tracking-wide">Email Delivery</div>
              <span className={`font-medium text-xs ${ec.color}`}>{ec.icon} {ec.label}</span>
            </div>
          </div>

          {/* Message body */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-3">Message</h2>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-4">
              {submission.message}
            </div>
          </div>

          {/* Admin notes */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-bold text-gray-900 text-sm mb-3">Admin Notes</h2>
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={4}
              placeholder="Add internal notes about this submission..."
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary-400 resize-none"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-gray-400">{msg}</span>
              <button
                onClick={() => update({ adminNotes })}
                disabled={saving}
                className="px-4 py-1.5 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Notes"}
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar — status + quick reply */}
        <div className="space-y-4">
          {/* Status control */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Status</h3>
            <div className="space-y-2">
              {statusOptions.map((s) => (
                <button
                  key={s}
                  onClick={() => update({ status: s })}
                  disabled={submission.status === s || saving}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                    submission.status === s
                      ? `${statusColors[s]} opacity-100 cursor-default`
                      : "border-gray-100 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {s === "new" ? "🔵 New" : s === "read" ? "⚪ Read" : s === "responded" ? "✅ Responded" : "📦 Archived"}
                </button>
              ))}
            </div>
          </div>

          {/* Quick reply link */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Quick Reply</h3>
            <a
              href={`mailto:${submission.email}?subject=Re: ${encodeURIComponent(submission.subject)}&body=Dear ${encodeURIComponent(submission.name)},%0A%0A`}
              className="block w-full text-center px-4 py-2 bg-primary-700 text-white text-xs font-semibold rounded-lg hover:bg-primary-800 transition-colors"
            >
              📧 Reply via Email
            </a>
            <p className="text-xs text-gray-400 text-center mt-2">Opens your default email client</p>
          </div>
        </div>
      </div>
    </div>
  );
}
