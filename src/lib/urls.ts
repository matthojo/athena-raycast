// Picking the link to save out of whatever's to hand.

/**
 * The http(s) link `text` is, or null. With `bare`, "example.com/page" counts
 * too: right for something typed as a link, wrong for a selection or the
 * clipboard, where "notes.txt" is far more likely a file name.
 */
export function asLink(text: unknown, bare = false): string | null {
  const raw = String(text ?? "").trim();
  if (!raw || /\s/.test(raw)) return null;
  const withScheme = /^https?:\/\//i.test(raw)
    ? raw
    : /^www\.[a-z0-9-]+\.[a-z0-9-]/i.test(raw) || (bare && /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#:]|$)/i.test(raw))
      ? `https://${raw}`
      : null;
  if (!withScheme) return null;
  try {
    const url = new URL(withScheme);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export interface LinkSource {
  url: string;
  title?: string;
  from: "typed" | "selection" | "browser" | "clipboard";
}

/**
 * The first of these that's a link: what was typed, the selected text, the
 * browser tab in front, the clipboard. Each is read only if the ones before
 * it gave nothing, so the clipboard isn't touched when a tab will do.
 */
export async function pickLink(sources: {
  typed?: string;
  selection: () => Promise<string | null | undefined>;
  tab: () => Promise<{ url: string; title?: string } | null | undefined>;
  clipboard: () => Promise<string | null | undefined>;
}): Promise<LinkSource | null> {
  const quiet = async <T>(read: () => Promise<T>): Promise<T | null> => {
    try {
      return await read();
    } catch {
      return null;
    }
  };
  const typed = asLink(sources.typed, true);
  if (typed) return { url: typed, from: "typed" };
  const selected = asLink(await quiet(sources.selection));
  if (selected) return { url: selected, from: "selection" };
  const tab = await quiet(sources.tab);
  const tabUrl = asLink(tab?.url);
  if (tabUrl) return { url: tabUrl, title: tab?.title || undefined, from: "browser" };
  const copied = asLink(await quiet(sources.clipboard));
  if (copied) return { url: copied, from: "clipboard" };
  return null;
}
