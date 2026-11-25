// Search asks Athena two things at once: what's called this (/api/mentions,
// titles across every kind) and what says this (/api/recall, the text of
// notes, to-dos, facts and days). This puts the answers in one list.

import type { Thing } from "./links";
import type { Mention, RecallHit } from "./types";

export interface Row extends Thing {
  /** Stable across both sources, so a thing found twice shows once. */
  key: string;
  title: string;
  subtitle: string;
  /** "Person", "To-do", "Wine". */
  label: string;
  section: "titles" | "text";
}

const LABEL: Record<string, string> = {
  person: "Person",
  place: "Place",
  organisation: "Organisation",
  event: "Event",
  note: "Note",
  project: "Project",
  record: "Record",
  saved: "Saved",
  todo: "To-do",
  watch: "Watch & read",
  fact: "Fact",
  interaction: "Catch-up",
  day: "Day",
};

/** Recall and mentions name two kinds differently. */
const SAME: Record<string, string> = { commitment: "todo", reading: "watch" };

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function mentionRow(m: Mention): Row {
  return {
    key: `${m.kind}:${m.id}`,
    kind: m.kind,
    id: m.id,
    kindId: m.kind_id,
    title: m.title,
    subtitle: m.subtitle,
    label: LABEL[m.kind] ?? capital(m.kind),
    section: "titles",
  };
}

export function recallRow(h: RecallHit): Row {
  const kind = SAME[h.kind] ?? h.kind;
  const who = h.person?.name;
  const label =
    kind === "record" && h.custom_kind?.one
      ? capital(h.custom_kind.one)
      : kind === "fact"
        ? who
          ? `About ${who}`
          : "About you"
        : (LABEL[kind] ?? capital(kind));
  const subtitle = kind === "interaction" && who ? [who, h.snippet].filter(Boolean).join(" · ") : h.snippet;
  return { key: `${kind}:${h.id}`, kind, id: h.id, kindId: h.custom_kind?.id, person: h.person, title: h.title, subtitle, label, section: "text" };
}

/** Title matches first, then text matches that aren't already there. */
export function mergeResults(mentions: Mention[], hits: RecallHit[]): Row[] {
  const rows = mentions.map(mentionRow);
  const seen = new Set(rows.map((r) => r.key));
  for (const hit of hits) {
    const row = recallRow(hit);
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    rows.push(row);
  }
  return rows;
}
