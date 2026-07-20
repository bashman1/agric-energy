import Link from "next/link";

interface StatCardProps {
  label: string;
  value: number | string;
  icon: string;
  /** Kept for API compatibility; the institutional card is monochrome. */
  color?: string;
  href?: string;
}

export default function StatCard({ label, value, icon, href }: StatCardProps) {
  const inner = (
    <div className="card card-hover h-full p-5">
      <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl mb-3 bg-primary-50 text-primary-700">
        {icon}
      </div>
      <div className="text-3xl font-display font-semibold text-ink-900 mb-0.5 tabular-nums">
        {value}
      </div>
      <div className="text-sm font-medium text-ink-500">{label}</div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {inner}
    </Link>
  ) : (
    inner
  );
}
