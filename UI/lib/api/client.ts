// ============================================================
// Laravel API client — isomorphic.
//
// Two callers, two modes:
//
//  • Server (Node, once per request). Public pages render against
//    API_URL, an absolute URL pointing at Laravel — in production the
//    127.0.0.1:8080 loopback vhost, so the call never leaves the droplet.
//    No token is sent, so these see published content only.
//
//  • Browser. nginx fronts both the Node server and Laravel on one
//    origin, so /api/v1 is SAME-ORIGIN: a relative base works and there
//    is no CORS configuration anywhere. The Sanctum token is attached
//    from the session store for admin/partner calls.
//
// All /lib/data/* service functions call through here, so pages and
// components keep their existing signatures.
// ============================================================
import { clearSession, getToken } from "@/lib/auth/token";

/**
 * Browser: same-origin relative base in production (nginx routes /api/v1
 * to Laravel and everything else to Node). In split dev mode `next dev`
 * runs on :3000 while Laravel is on :8000, so a relative base would hit
 * the Next dev server — set NEXT_PUBLIC_API_URL to the absolute Laravel
 * base to reach it directly.
 * Node: absolute, from the env. Must be set in production (the systemd
 * unit does it); the default only suits `php artisan serve` locally.
 */
const API_BASE =
  typeof window === "undefined"
    ? (process.env.API_URL ?? "http://127.0.0.1:8000/api/v1")
    : (process.env.NEXT_PUBLIC_API_URL ?? "/api/v1");

type Params = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  params?: Params;
  /** Sanctum bearer token. Omitted in the browser — taken from the store. */
  token?: string;
}

export function buildUrl(pathname: string, params?: Params): string {
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
 * Never cache, on either side.
 *
 * `no-store` on the server is what makes every public page dynamic: Next
 * renders it per request against Laravel, so content approved in the
 * admin panel is on the public site immediately. This is the whole point
 * of running a Node server instead of the old static export, where an
 * approval was invisible until someone re-ran the build.
 *
 * If Laravel ever struggles under this, the fix is a short revalidation
 * window here (`{ next: { revalidate: 30 } }`) rather than going back to
 * build-time caching — `force-cache` would silently re-freeze the site.
 *
 * In the browser these options mean the usual thing: always fetch fresh.
 */
function cacheOptions(): RequestInit {
  return { cache: "no-store" };
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
 * As apiSend, but keeps the response envelope and status.
 *
 * apiSend unwraps `json.data`, which is what almost every caller wants and
 * exactly wrong for the endpoints that answer 202: an edit to a published
 * record comes back as the UNCHANGED record under `data`, with the fact that
 * it was queued for review alongside it. Unwrapping there would report a
 * successful save that did not happen.
 */
export async function apiSendWithMeta<T>(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  pathname: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<{ status: number; data: T | null; body: Record<string, unknown> }> {
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
  if (res.status === 204) return { status: res.status, data: null, body: {} };

  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  return { status: res.status, data: (json.data ?? json) as T, body: json };
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
    // nginx answers an oversized body with an HTML 413, not JSON.
    if (res.status === 413) throw new ApiError(413, "That file is too large to upload.");
    const err = await res.json().catch(() => ({}));
    // Validation failures carry `message`; the media endpoint's own
    // file-type refusal carries `error`.
    throw new ApiError(res.status, err?.message ?? err?.error ?? "Upload failed", err);
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
