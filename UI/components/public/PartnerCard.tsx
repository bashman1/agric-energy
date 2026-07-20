import Link from "next/link";
import { Partner } from "@/lib/types";
import { MapPinIcon } from "@/components/shared/icons";

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export default function PartnerCard({ partner }: { partner: Partner }) {
  const initials = getInitials(partner.name);

  return (
    <Link
      href={`/partners/${partner.slug}`}
      className="card card-hover group flex flex-col h-full"
    >
      {/* Header: logo / initials mark + type eyebrow + name */}
      <div className="flex items-start gap-3 p-5 pb-4">
        <div
          className={`shrink-0 w-11 h-11 rounded-lg overflow-hidden flex items-center justify-center ${
            partner.logo
              ? "bg-white border border-ink-200 p-1"
              : "bg-primary-700 text-white"
          }`}
        >
          {partner.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={partner.logo}
              alt={`${partner.name} logo`}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="font-bold text-sm">{initials}</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-primary-700 truncate">
            {partner.type}
          </div>
          <h3 className="font-semibold text-ink-900 leading-snug mt-0.5 group-hover:text-primary-700 transition-colors line-clamp-2">
            {partner.name}
          </h3>
        </div>
      </div>

      {/* Summary */}
      <div className="px-5 flex-1">
        <p className="text-sm text-ink-500 leading-relaxed line-clamp-3">
          {partner.summary}
        </p>
      </div>

      {/* Footer: regions */}
      {partner.regions && partner.regions.length > 0 && (
        <div className="mt-4 mx-5 mb-5 pt-3 border-t border-ink-100 flex flex-wrap items-center gap-1.5">
          {partner.regions.slice(0, 3).map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-1 text-xs bg-ink-50 text-ink-600 px-2 py-0.5 rounded-full border border-ink-200"
            >
              <MapPinIcon className="text-ink-400 shrink-0" />
              {r}
            </span>
          ))}
          {partner.regions.length > 3 && (
            <span className="text-xs text-ink-400">+{partner.regions.length - 3}</span>
          )}
        </div>
      )}
    </Link>
  );
}
