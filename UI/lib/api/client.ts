// ============================================================
// Laravel API client — isomorphic.
//
// Two callers, two modes:
//
//  • Build time (Node). Public pages and generateStaticParams prerender
//    against API_URL, an absolute URL pointing at Laravel. No token —
//    only published content is baked into the export.
//
//  • Runtime (browser). The static bundle is served by Laravel itself, so
//    /api/v1 is SAME-ORIGIN: a relative base works, and there is no CORS
//    configuration anywhere. The Sanctum token is attached from the
//    session store for admin/partner calls.
//
// All /lib/data/* service functions call through here, so pages and
// components keep their existing signatures.
// ============================================================
import { clearSession, getToken } from "@/lib/auth/token";

/** Browser: same-origin relative base. Node: absolute, from the env. */
const API_BASE =
  typeof window === "undefined"
    ? (process.env.API_URL ?? "http://127.0.0.1:8000/api/v1")
    : "/api/v1";

type Params = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  params?: Params;
  /** Sanctum bearer token. Omitted in the browser — taken from the store. */
  token?: string;
}

function buildUrl(pathname: string, params?: Params): string {
  const path = pathname.replace(/^\//, "");
  // A relative base can't go through URL(), so build the query by hand.
  const search = new URLSearchParams();
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        search.set(key, String(value));
      }
    }
  }
  const qs = search.toString();
  const base = API_BASE.replace(/\/$/, "");
  return `${base}/${path}${qs ? `?${qs}` : ""}`;
}

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  const bearer = token ?? getToken();
  if (bearer) h.Authorization = `Bearer ${bearer}`;
  return h;
}

/**
 * Build-time fetches must be CACHED, not `no-store`.
 *
 * Next treats an uncached fetch as dynamic data. In an export that means
 * the page is emitted as an empty static shell with the content deferred
 * to the client — which silently destroys prerendering: the HTML ships
 * with no content and nothing fails. Prerendering is the entire point
 * here, so the build path opts into the cache.
 *
 * In the browser these options are meaningless; data must always be
 * fresh, so `no-store` is correct there.
 */
function cacheOptions(): RequestInit {
  if (typeof window !== "undefined") return { cache: "no-store" };
  return { cache: "force-cache" };
}

/**
 * A 401 means the stored token expired or was revoked. Drop it so the
 * client-side route guards bounce the user to the login page rather than
 * leaving a half-authenticated shell rendering empty data.
 */
function handleUnauthorized(status: number): void {
  if (status === 401 && typeof window !== "undefined") clearSession();
}

/**
 * GET a resource. Returns the parsed `data` field of the API envelope,
 * or `fallback` on any error (so the UI degrades gracefully).
 */
export async function apiGet<T>(
  pathname: string,
  fallback: T,
  options: RequestOptions = {}
): Promise<T> {
  try {
    const res = await fetch(buildUrl(pathname, options.params), {
      headers: headers(options.token),
      ...cacheOptions(),
    });
    if (!res.ok) {
      handleUnauthorized(res.status);
      return fallback;
    }
    const json = await res.json();
    return (json.data ?? fallback) as T;
  } catch {
    return fallback;
  }
}

/** GET returning the full envelope ({ data, total }). */
export async function apiGetEnvelope<T>(
  pathname: string,
  options: RequestOptions = {}
): Promise<{ data: T[]; total: number }> {
  const data = await apiGet<T[]>(pathname, [], options);
  return { data, total: data.length };
}

/** Mutating request (POST/PUT/PATCH/DELETE). Throws on non-2xx. */
export async function apiSend<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  pathname: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T | null> {
  const res = await fetch(buildUrl(pathname, options.params), {
    method,
    headers: headers(options.token),
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err?.message ?? "Request failed", err);
  }
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  return (json.data ?? json) as T;
}

/**
 * Multipart upload (POST /media). Browser-only — the Content-Type header
 * must be left unset so the runtime supplies the multipart boundary.
 */
export async function apiUpload<T>(
  pathname: string,
  form: FormData
): Promise<T | null> {
  const token = getToken();
  const res = await fetch(buildUrl(pathname), {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
    cache: "no-store",
  });
  if (!res.ok) {
    handleUnauthorized(res.status);
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err?.message ?? "Upload failed", err);
  }
  const json = await res.json().catch(() => ({}));
  return (json.data ?? json) as T;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public payload?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}
