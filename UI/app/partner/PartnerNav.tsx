"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { logout } from "@/lib/auth/actions";
import { useSession } from "@/lib/auth/useSession";
import { apiGet } from "@/lib/api/client";

export default function PartnerNav({
  loggedIn,
  name,
}: {
  loggedIn: boolean;
  name: string;
}) {
  const router = useRouter();
  const { canManagePartnerTeam } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!loggedIn) return;
    apiGet<{ unreadCount: number }>("notifications", { unreadCount: 0 }).then((res) => {
      setUnreadCount(res.unreadCount ?? 0);
    });
  }, [loggedIn]);

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
      <Link href="/partner/profile" className="text-primary-100 hover:text-white">
        Profile
      </Link>
      <Link href="/partner/notifications" className="relative text-primary-100 hover:text-white">
        Notifications
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-3 bg-white text-primary-800 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Link>
      {canManagePartnerTeam && (
        <Link href="/partner/team" className="text-primary-100 hover:text-white">
          Team
        </Link>
      )}
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
