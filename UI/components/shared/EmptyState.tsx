interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: string;
  action?: { label: string; href: string };
}

export default function EmptyState({
  title = "No results found",
  message = "Try adjusting your search or filters.",
  icon = "🔍",
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm">{message}</p>
      {action && (
        <a
          href={action.href}
          className="mt-5 inline-flex items-center px-4 py-2 bg-primary-700 text-white text-sm font-semibold rounded-lg hover:bg-primary-800 transition-colors"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}
