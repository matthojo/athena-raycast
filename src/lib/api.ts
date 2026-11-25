// Requests to the owner's Athena and what its answers mean. No Raycast
// imports: fetch is passed in, so this runs under node:test.

import type { Settings } from "./settings";

export type Failure =
  /** The key was refused. */
  | "auth"
  /** A capture key was used where a full access key is needed. */
  | "scope"
  /** Athena couldn't be reached, or is busy. Worth trying again. */
  | "offline"
  /** Athena won't take this request as it is. */
  | "rejected";

export class AthenaError extends Error {
  constructor(
    readonly failure: Failure,
    message: string,
    readonly status = 0,
  ) {
    super(message);
    this.name = "AthenaError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT";
  query?: Record<string, string | number | undefined>;
  body?: unknown;
  /** True for the paths a capture key opens. Everything else needs a full access key. */
  capture?: boolean;
  signal?: AbortSignal;
  /** Milliseconds. A capture waits on Athena's assistant, so it gets longer. */
  timeout?: number;
}

export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export const NEEDS_FULL_KEY = "This needs a full access key (athk_…). Make one in Athena under Settings → API keys.";

export function buildUrl(origin: string, path: string, query: RequestOptions["query"] = {}): string {
  const url = new URL(path, origin);
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") url.searchParams.set(name, String(value));
  }
  return url.href;
}

/** What a status means. `said` is Athena's own error line, when it sent one. */
export function failureFor(status: number, said: string): AthenaError {
  if (status === 401 || status === 403) {
    return new AthenaError("auth", "Athena didn't accept the key. Check it in the extension's preferences.", status);
  }
  if (status === 429) return new AthenaError("offline", said || "Athena asked to slow down. Try again shortly.", status);
  if (status === 408 || status === 425 || status >= 500) {
    return new AthenaError("offline", said || "Athena didn't answer. Try again shortly.", status);
  }
  if (status === 404 || status === 405) {
    return new AthenaError("rejected", "This Athena can't do that yet. Update it, then try again.", status);
  }
  return new AthenaError("rejected", said || `Athena refused that (${status}).`, status);
}

/**
 * Sends one request and returns the JSON (or text) Athena answered with.
 * Throws AthenaError for anything else. The key goes to the owner's Athena
 * and nowhere else: redirects are refused, so it can't follow one off-site.
 */
export async function request<T>(settings: Settings, path: string, options: RequestOptions = {}, fetchImpl: Fetch = fetch): Promise<T> {
  return (await send<T>(settings, path, options, fetchImpl)).body;
}

/** The same, with the status: Saved answers 201 for a new item and 200 for one it already had. */
export async function send<T>(settings: Settings, path: string, options: RequestOptions = {}, fetchImpl: Fetch = fetch): Promise<{ status: number; body: T }> {
  if (!options.capture && settings.scope !== "full") throw new AthenaError("scope", NEEDS_FULL_KEY);
  const headers: Record<string, string> = { Authorization: `Bearer ${settings.key}`, Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const timeout = AbortSignal.timeout(options.timeout ?? 20_000);
  let res: Response;
  try {
    res = await fetchImpl(buildUrl(settings.origin, path, options.query), {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      redirect: "error",
      signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
    });
  } catch (error) {
    // The caller gave up (a newer search replaced this one): pass that on as it is.
    if (options.signal?.aborted) throw error;
    throw new AthenaError("offline", "Couldn't reach Athena. Check the address and your connection.");
  }
  const isJson = (res.headers.get("content-type") ?? "").includes("json");
  let body: unknown = null;
  try {
    body = res.status === 204 ? null : isJson ? await res.json() : await res.text();
  } catch {
    body = null;
  }
  if (res.ok) return { status: res.status, body: body as T };
  const said = isJson && body && typeof (body as { error?: unknown }).error === "string" ? (body as { error: string }).error.slice(0, 200) : "";
  throw failureFor(res.status, said);
}
