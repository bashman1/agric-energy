// ============================================================
// Auth actions — browser-side, talking to Laravel directly.
//
// Replaces app/api/auth/{login,register,logout}/route.ts. Those existed
// only to keep the Sanctum token server-side in an iron-session cookie;
// with no Node server the browser holds it (see ./token.ts).
// ============================================================
import { ApiError, apiGet, apiSend } from "@/lib/api/client";
import type { AuthUser } from "@/lib/types";
import { clearSession, getToken, setSession } from "./token";

interface LoginResponse {
  token?: string;
  data?: AuthUser;
  message?: string;
  errors?: Record<string, string[]>;
}

/**
 * Authenticate and store the token. Throws with the API's own message so
 * the login form can distinguish bad credentials from a pending account.
 */
export async function login(email: string, password: string): Promise<AuthUser> {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  const json: LoginResponse = await res.json().catch(() => ({}));

  if (!res.ok || !json.token || !json.data) {
    // 422 = pending approval / bad credentials; surface the API message.
    throw new ApiError(
      res.status,
      json.errors?.email?.[0] ?? json.message ?? "Invalid credentials"
    );
  }

  const user = json.data;
  setSession(json.token, {
    username: user.email,
    userId: user.id,
    name: user.name,
    email: user.email,
    roles: user.roles,
    status: user.status,
  });
  return user;
}

/** Register a partner account. The API returns a pending, tokenless user. */
export async function register(payload: Record<string, unknown>): Promise<void> {
  await apiSend("POST", "auth/register", payload);
}

/** Revoke the token server-side, then clear it locally regardless. */
export async function logout(): Promise<void> {
  if (getToken()) {
    try {
      await apiSend("POST", "auth/logout");
    } catch {
      // Best-effort revocation — a network failure must not strand the
      // user in a logged-in shell.
    }
  }
  clearSession();
}

/**
 * Validate the stored token against Laravel and refresh the cached user.
 * Called on mount by useSession so a revoked or expired token is caught
 * before any guarded page renders.
 */
export async function refreshUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const user = await apiGet<AuthUser | null>("auth/me", null);
    if (!user) {
      // A valid token always returns a user; anything else is a dead session.
      clearSession();
      return null;
    }
    setSession(token, {
      username: user.email,
      userId: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      status: user.status,
    });
    return user;
  } catch {
    // apiSend already cleared the session on a 401.
    return null;
  }
}
