// Bare layout for unauthenticated admin pages (login, forgot password, etc.)
// This layout intentionally has NO sidebar or admin chrome.
export default function AdminAuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
