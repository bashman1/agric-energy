import { getSubmissionById } from "@/lib/data/submissions";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import SubmissionDetailClient from "./SubmissionDetailClient";
import { getAuthToken } from "@/lib/auth/session";

interface Props { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const token = await getAuthToken();
  const s = await getSubmissionById(id, token);
  if (!s) return { title: "Submission Not Found" };
  return { title: `Submission: ${s.subject}` };
}

export default async function AdminSubmissionDetailPage({ params }: Props) {
  const { id } = await params;
  const token = await getAuthToken();
  const submission = await getSubmissionById(id, token);
  if (!submission) notFound();

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-ink-500 mb-6">
        <Link href="/admin/submissions" className="hover:text-primary-700">Submissions</Link>
        <span>/</span>
        <span className="text-ink-800 font-medium truncate max-w-xs">{submission.subject}</span>
      </nav>

      <SubmissionDetailClient submission={submission} />
    </div>
  );
}
