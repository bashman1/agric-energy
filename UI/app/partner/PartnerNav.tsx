"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logout } from "@/lib/auth/actions";

export default function PartnerNav({
  loggedIn,
  name,
}: {
  loggedIn: boolean;
  name: string;
}) {
  const router = useRouter();

  const signOut = async () => {
    await logout();
    router.replace("/partner/login");
  };

  if (!loggedIn) {
    return (
      <nav className="flex items-center gap-3 text-sm">
        <Link href="/partner/login" className="text-primary-100 hover:text-white">
          Sign in
        </Link>
        <Link
          href="/partner/register"
          className="px-3 py-1.5 bg-white text-primary-800 font-bold rounded-lg text-xs"
        >
          Register
        </Link>
      </nav>
    );
  }

  return (
    <nav className="flex items-center gap-4 text-sm">
      <Link href="/partner" className="text-primary-100 hover:text-white">
        Dashboard
      </Link>
      <span className="text-primary-200 text-xs hidden sm:inline">{name}</span>
      <button
        onClick={signOut}
        className="text-primary-100 hover:text-white text-xs"
      >
        Sign out
      </button>
    </nav>
  );
}
