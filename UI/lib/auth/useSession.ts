// ============================================================
// useSession — subscribes React to the browser-side token store.
//
// `loading` matters: on first paint the store has not been validated
// against /auth/me yet, so guards must render nothing rather than
// flashing a redirect at a user who is in fact signed in.
// ============================================================
"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { refreshUser } from "./actions";
import {
  USER_KEY,
  canManageContent,
  canReview,
  canApproveOrgContent,
  canManagePartnerTeam,
  canManageUsers,
  getUser,
  isStaff,
  isSuperAdmin,
  subscribe,
} from "./token";

/** Server snapshot is always null — the export prerenders logged-out. */
const serverSnapshot = () => null;

/**
 * getUser() parses JSON on every call, so it returns a fresh object each
 * time and would loop useSyncExternalStore. Cache by the raw string.
 */
let cachedRaw: string | null = null;
let cachedUser: ReturnType<typeof getUser> = null;

function snapshot(): ReturnType<typeof getUser> {
  const raw =
    typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem(USER_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedUser = getUser();
  }
  return cachedUser;
}

export function useSession() {
  const user = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Revalidate the stored token once per mount — it may have been
    // revoked or expired since the tab was opened.
    refreshUser().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    user,
    loading,
    isLoggedIn: !!user,
    isStaff: isStaff(user),
    canManageContent: canManageContent(user),
    canReview: canReview(user),
    canManageUsers: canManageUsers(user),
    canManagePartnerTeam: canManagePartnerTeam(user),
    canApproveOrgContent: canApproveOrgContent(user),
    isSuperAdmin: isSuperAdmin(user),
  };
}
