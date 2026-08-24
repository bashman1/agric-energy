import Link from "next/link";
import { Resource } from "@/lib/types";
import { DocumentIcon, DownloadIcon, ExternalLinkIcon } from "@/components/shared/icons";

export default function ResourceCard({ resource }: { resource: Resource }) {
  const hasLink = !!(resource.fileUrl || resource.externalUrl);
  const publishedMonth = resource.publicationDate
    ? resource.publicationDate.slice(0, 7)
    : null;

  return (
    <Link
      href={`/resources/${resource.slug}`}
      className="card card-hover group flex flex-col h-full"
    >
      {/* Header: monochrome mark + type eyebrow, date secondary */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <span
          className="shrink-0 w-9 h-9 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center text-lg"
          aria-hidden="true"
        >
          <DocumentIcon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary-700 truncate">
            {resource.type}
          </div>
          {publishedMonth && (
            <div className="text-[11px] text-ink-400 mt-0.5 tabular-nums">
              {publishedMonth}
            </div>
          )}
        </div>
      </div>

      {/* Title + summary */}
      <div className="px-5 flex-1">
        <h3 className="font-semibold text-ink-900 leading-snug mb-2 group-hover:text-primary-700 transition-colors line-clamp-2">
          {resource.title}
        </h3>
        <p className="text-sm text-ink-500 leading-relaxed line-clamp-3">
          {resource.summary}
        </p>
      </div>

      {/* Footer: download / view affordance */}
      {hasLink && (
        <div className="mt-4 mx-5 mb-5 pt-3 border-t border-ink-100">
          <span className="inline-flex items-center gap-1.5 text-primary-700 text-xs font-semibold">
            {/* A view-only resource must not advertise a download it will not
                give — the card is where most visitors decide what to open. */}
            {resource.fileUrl && resource.fileDownloadable !== false ? (
              <>
                <DownloadIcon className="shrink-0" />
                Download PDF
              </>
            ) : resource.fileUrl ? (
              <>
                <DocumentIcon className="shrink-0" />
                Read online
              </>
            ) : (
              <>
                <ExternalLinkIcon className="shrink-0" />
                View resource
              </>
            )}
          </span>
        </div>
      )}
    </Link>
  );
}
