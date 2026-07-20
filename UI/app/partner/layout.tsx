import Link from "next/link";
import type { Metadata } from "next";
import { getSession } from "@/lib/auth/session";
import PartnerNav from "./PartnerNav";

export const metadata: Metadata = {
  title: { default: "Partner Portal", template: "%s — Partner Portal" },
};

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const loggedIn = !!session.isLoggedIn;
  const name = session.name ?? "";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary-800 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/partner" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center font-bold text-xs">
              AE
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm">Agri-Energy Desk</div>
              <div className="text-primary-200 text-[11px]">Partner Portal</div>
            </div>
          </Link>
          <PartnerNav loggedIn={loggedIn} name={name} />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
