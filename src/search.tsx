import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { Problem } from "./components/problem";
import { athena, currentSettings } from "./lib/athena";
import { mentionLink, pageFor } from "./lib/links";
import { mergeResults, type Row } from "./lib/search";
import type { Mention, RecallHit } from "./lib/types";

const ICON: Record<string, Icon> = {
  person: Icon.Person,
  place: Icon.Pin,
  organisation: Icon.Building,
  event: Icon.Calendar,
  note: Icon.Document,
  project: Icon.Folder,
  record: Icon.Box,
  saved: Icon.Bookmark,
  todo: Icon.Circle,
  watch: Icon.Book,
  fact: Icon.LightBulb,
  interaction: Icon.SpeechBubble,
  day: Icon.Sun,
};

async function search(query: string, signal?: AbortSignal): Promise<Row[]> {
  const q = query.trim();
  // Nothing typed: what was touched lately.
  if (!q) return mergeResults((await athena<{ results: Mention[] }>("/api/mentions", { query: { limit: 20 }, signal })).results, []);
  const [titles, text] = await Promise.all([
    athena<{ results: Mention[] }>("/api/mentions", { query: { q, limit: 12 }, signal }),
    athena<{ results: RecallHit[] }>("/api/recall", { query: { q, limit: 20 }, signal }),
  ]);
  return mergeResults(titles.results, text.results);
}

export default function Command() {
  const [query, setQuery] = useState("");
  const abortable = useRef<AbortController | null>(null);
  const { data, isLoading, error, revalidate } = useCachedPromise((q: string) => search(q, abortable.current?.signal), [query], {
    abortable,
    keepPreviousData: true,
    // The list shows the failure itself; no toast on top of it.
    onError: () => undefined,
  });
  const checked = currentSettings();
  const origin = checked.ok ? checked.settings.origin : "";
  const rows = error ? [] : (data ?? []);
  const titles = rows.filter((r) => r.section === "titles");
  const text = rows.filter((r) => r.section === "text");

  const item = (row: Row) => {
    const link = mentionLink(row, row.title);
    return (
      <List.Item
        key={row.key}
        icon={ICON[row.kind] ?? Icon.Dot}
        title={row.title || "Untitled"}
        subtitle={row.subtitle}
        accessories={[{ tag: row.label }]}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open in Athena" url={pageFor(origin, row)} />
            <Action.CopyToClipboard title="Copy Title" content={row.title} shortcut={Keyboard.Shortcut.Common.CopyName} />
            {link && <Action.CopyToClipboard title="Copy Athena Link" content={link} shortcut={Keyboard.Shortcut.Common.CopyDeeplink} />}
            <Action.CopyToClipboard title="Copy Web Address" content={pageFor(origin, row)} shortcut={Keyboard.Shortcut.Common.Copy} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} onSearchTextChange={setQuery} throttle searchBarPlaceholder="Search people, notes, to-dos, places, saved things">
      {error ? (
        <Problem error={error} retry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.MagnifyingGlass} title={query.trim() ? "Nothing in Athena matches that" : "Nothing in Athena yet"} />
      )}
      <List.Section title={query.trim() ? "Called this" : "Recent"}>{titles.map(item)}</List.Section>
      <List.Section title="Says this">{text.map(item)}</List.Section>
    </List>
  );
}
