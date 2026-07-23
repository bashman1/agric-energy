// A contact-form submission. Client-rendered and keyed by ?id=, since
// submissions arrive after the build and have no prerendered page.
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { getSubmissionById } from "@/lib/data/submissions";
import { useAsync } from "@/lib/hooks/useAsync";
import SubmissionDetailClient from "./SubmissionDetailClient";

function Detail() {
  const id = useSearchParams().get("id") ?? "";
  const { data: submission, loading, error } = useAsync(
    () => (id ? getSubmissionById(id) : Promise.resolve(null)),
    [id]
  );

  return (
    <div>
      <nav className="flex items-center gap-2 text-sm text-ink-500 mb-6">
        <Link href="/admin/submissions" className="hover:text-primary-700">
          Submissions
        </Link>
        <span>/</span>
        <span className="text-ink-800 font-medium truncate max-w-xs">
          {submission?.subject ?? "…"}
        </span>
      </nav>

      {loading && <p className="text-sm text-ink-500">Loading submission…</p>}
      {error && (
        <p className="text-sm text-red-700">
          Could not load this submission: {error.message}
        </p>
      )}
      {!loading && !error && !submission && (
        <p className="text-sm text-ink-600">No submission found for “{id}”.</p>
      )}
      {submission && <SubmissionDetailClient submission={submission} />}
    </div>
  );
}

// useSearchParams needs a Suspense boundary to prerender.
export default function Page() {
  return (
    <Suspense fallback={null}>
      <Detail />
    </Suspense>
  );
}
