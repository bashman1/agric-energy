interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
  /**
   * Either a link or a handler. Listing pages now clear their filters in
   * the browser rather than navigating to a bare URL, so both are allowed.
   */
  action?:
    | { label: string; href: string; onClick?: never }
    | { label: string; onClick: () => void; href?: never };
}

export default function EmptyState({
  title = "No results found",
  message = "Try adjusting your search or filters.",
  icon = "🔍",
  action,
}: EmptyStateProps) {
  const className =
    "mt-5 inline-flex items-center px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors";

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{message}</p>
      {action?.href && (
        <a href={action.href} className={className}>
          {action.label}
        </a>
      )}
      {action?.onClick && (
        <button type="button" onClick={action.onClick} className={className}>
          {action.label}
        </button>
      )}
    </div>
  );
}
