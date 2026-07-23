import type { Metadata } from "next";
import PartnerShell from "./PartnerShell";

export const metadata: Metadata = {
  title: { default: "Partner Portal", template: "%s — Partner Portal" },
};

/**
 * Server half: `metadata` is a server-only export, so the session-aware
 * chrome and the auth guard live in PartnerShell (a client component).
 */
export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PartnerShell>{children}</PartnerShell>;
}
