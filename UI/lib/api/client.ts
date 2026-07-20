// ============================================================
// Laravel API client
// Server-side fetch helper for the Agri-Energy Desk REST API.
// All /lib/data/* service functions call the API through here,
// so pages and components keep their existing signatures.
// ============================================================

const API_BASE =
  process.env.API_URL ?? "http://127.0.0.1:8000/api/v1";

type Params = Record<string, string | number | boolean | undefined | null>;

interface RequestOptions {
  params?: Params;
  token?: string; // Sanctum bearer token for authenticated calls
  /** Revalidate window (seconds) for Next's fetch cache. 0 = no store. */
  revalidate?: number;
}

function buildUrl(pathname: string, params?: Params): string {
  const url = new URL(
    `${API_BASE}/${pathname.replace(/^\//, "")}`
  );
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

function headers(token?: string): HeadersInit {
  const h: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
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
      next: { revalidate: options.revalidate ?? 0 },
    });
    if (!res.ok) return fallback;
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
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err?.message ?? "Request failed", err);
  }
  if (res.status === 204) return null;
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
