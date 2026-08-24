"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api/client";

/**
 * In-page reader for a resource's attached document.
 *
 * The address is fetched rather than rendered into the page, because for a
 * view-only resource it is a signed URL that expires — there is no permanent
 * path to link to, which is the point. If it lapses while someone is reading,
 * they reload rather than losing access permanently.
 *
 * Downloadable material uses the same reader over its ordinary public URL, so
 * a visitor reads in place either way and downloading is the extra step rather
 * than the only one.
 */

interface FileLink {
  url: string;
  downloadable: boolean;
  name: string;
  expiresAt: string | null;
}

export default function ResourceReader({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const [link, setLink] = useState<FileLink | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;

    apiGet<FileLink | null>(`resources/${slug}/file-link`, null)
      .then((res) => {
        if (!active) return;
        if (res?.url) setLink(res);
        else setFailed(true);
      })
      .catch(() => active && setFailed(true));

    return () => {
      active = false;
    };
  }, [slug]);

  if (failed) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
        This document could not be opened. It may have been moved or withdrawn.
      </div>
    );
  }

  if (!link) {
    return (
      <div
        className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500"
        role="status"
      >
        Opening document…
      </div>
    );
  }

  return (
    <figure className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
      <iframe
        src={link.url}
        title={`${title} — document reader`}
        className="w-full h-[70vh] min-h-[420px] bg-white"
      />
      <figcaption className="px-4 py-2.5 text-xs text-gray-500 border-t border-gray-200 bg-white">
        {link.downloadable ? (
          <>
            Reading {link.name || "document"} in place.{" "}
            <a
              href={link.url}
              download
              className="font-semibold text-primary-700 hover:text-primary-800"
            >
              Download a copy
            </a>
            .
          </>
        ) : (
          <>
            This document is shared for reading only. It can be read in full here, but
            the owner has not made it available to download.
          </>
        )}
      </figcaption>
    </figure>
  );
}
