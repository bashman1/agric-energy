import Link from "next/link";
import type { ReactNode } from "react";
import { PlusIcon } from "@/components/shared/icons";

// ============================================================
// Shared admin page header — serif title, muted subtitle, and an
// optional primary action button. Standardises every admin list page.
// ============================================================

interface Props {
  title: string;
  subtitle?: string;
  action?: { label: string; href: string; icon?: ReactNode };
}

export default function AdminPageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-500 mt-1">{subtitle}</p>}
      </div>
      {action && (
        <Link href={action.href} className="btn btn-primary shrink-0">
          {action.icon ?? <PlusIcon />} {action.label}
        </Link>
      )}
    </div>
  );
}
