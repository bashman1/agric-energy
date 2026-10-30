"use client";
import FileUpload from "@/components/shared/FileUpload";
import { mediaUrl } from "@/lib/utils/mediaUrl";
import { MAX_GALLERY_IMAGES } from "@/lib/utils/uploadLimits";

/**
 * Editable photo gallery: thumbnails with remove buttons, plus an upload
 * button that disappears once the gallery is full. One component for the
 * admin and partner forms, so the cap is enforced the same way everywhere
 * (the API rejects an eleventh image too).
 */
export default function GalleryUpload({
  value,
  onChange,
}: {
  value: string[];
  onChange: (images: string[]) => void;
}) {
  const full = value.length >= MAX_GALLERY_IMAGES;

  return (
    <div>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-3 mb-3">
          {value.map((url, i) => (
            <li key={`${url}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={mediaUrl(url)} alt={`Gallery item ${i + 1}`} className="h-16 w-16 object-cover rounded border border-gray-200" />
              <button
                type="button"
                aria-label={`Remove gallery image ${i + 1}`}
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white border border-gray-200 text-gray-500 text-xs leading-none hover:text-red-600 hover:border-red-200 transition-colors"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {full ? (
        <p className="text-xs text-gray-500">
          The gallery is full ({MAX_GALLERY_IMAGES} images). Remove one to add another.
        </p>
      ) : (
        <FileUpload kind="image" value="" onUploaded={(url) => onChange([...value, url])} />
      )}
      <p className="text-[11px] text-gray-400 mt-1">
        {value.length} of {MAX_GALLERY_IMAGES} images.
      </p>
    </div>
  );
}
