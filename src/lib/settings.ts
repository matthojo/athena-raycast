// What the owner typed into the extension's preferences: their Athena's
// address and an API key. Pure functions, no Raycast imports, so they run
// under node:test.

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const KEY = /^ath[ck]_[A-Za-z0-9_-]{16,}$/;

/** What a key can do. A capture key adds things; a full key also reads. */
export type Scope = "capture" | "full";

export interface Settings {
  /** Like https://athena.example.com, with no path. */
  origin: string;
  key: string;
  scope: Scope;
}

export type Checked<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Turns what the owner typed into an origin like https://athena.example.com. */
export function normalizeAddress(input: unknown): Checked<{ origin: string }> {
  const raw = String(input ?? "").trim();
  if (!raw) return { ok: false, error: "Add your Athena address." };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "That doesn't look like a web address." };
  }
  if (url.username || url.password) return { ok: false, error: "Leave the name and password out of the address." };
  const local = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol === "http:" && !local) return { ok: false, error: "Use the https:// address. Plain http only works for localhost." };
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, error: "Use the https:// address." };
  if (!url.hostname.includes(".") && !local) return { ok: false, error: "That doesn't look like a web address." };
  return { ok: true, origin: url.origin };
}

/** Checks a pasted key is a capture key (athc_…) or a full access key (athk_…). */
export function readKey(input: unknown): Checked<{ key: string; scope: Scope }> {
  const key = String(input ?? "")
    .trim()
    .replace(/^Bearer\s+/i, "");
  if (!key) return { ok: false, error: "Paste an API key from Athena (Settings → API keys)." };
  if (key.startsWith("athm_")) {
    return { ok: false, error: "That's a Claude only key. Make a capture or full access key in Athena (Settings → API keys)." };
  }
  if (!KEY.test(key)) {
    return { ok: false, error: "Keys start with athc_ (capture) or athk_ (full access). Copy the whole key from Athena." };
  }
  return { ok: true, key, scope: key.startsWith("athk_") ? "full" : "capture" };
}

export function readSettings(prefs: { address?: unknown; key?: unknown }): Checked<{ settings: Settings }> {
  const address = normalizeAddress(prefs.address);
  if (!address.ok) return address;
  const key = readKey(prefs.key);
  if (!key.ok) return key;
  return { ok: true, settings: { origin: address.origin, key: key.key, scope: key.scope } };
}
