// Where a thing lives in the Athena app (its hash routes), and the
// athena:// link that mentions it in a note.

import type { PersonRef } from "./types";

export interface Thing {
  kind: string;
  id: string;
  /** A record's type, when Athena says. */
  kindId?: string;
  /** Who a fact or catch-up is about. */
  person?: PersonRef | null;
}

const e = encodeURIComponent;

/** The page to open in the browser for a thing. Falls back to the list it's in, then Home. */
export function pageFor(origin: string, thing: Thing): string {
  const { kind, id } = thing;
  const at = (path: string) => `${origin}/#/${path}`;
  switch (kind) {
    case "person":
      return at(`people/${e(id)}`);
    case "place":
      return at(`places/${e(id)}`);
    case "organisation":
      return at(`organisations/${e(id)}`);
    case "event":
      return at(`events/${e(id)}`);
    case "note":
      return at(`notes/${e(id)}`);
    case "saved":
      return at(`saved/${e(id)}`);
    case "day":
      return /^\d{4}-\d{2}-\d{2}$/.test(id) ? at(`days/${id}`) : at("days");
    case "record":
      return thing.kindId ? at(`kind/${e(thing.kindId)}/${e(id)}`) : at("library");
    case "todo":
    case "commitment":
      return at("loops");
    case "watch":
    case "reading":
      return at("reading");
    case "fact":
    case "interaction":
      return thing.person ? at(`people/${e(thing.person.id)}`) : at("");
    case "project":
      return at("library");
    default:
      return at("");
  }
}

const LINK_KIND: Record<string, string> = { commitment: "todo", reading: "watch" };
const LINKABLE = new Set(["person", "place", "organisation", "event", "note", "record", "saved", "todo", "watch"]);

/** The Markdown link Athena's notes use for a thing, or null for things that can't be linked. */
export function mentionLink(thing: Thing, title: string): string | null {
  const kind = LINK_KIND[thing.kind] ?? thing.kind;
  if (!LINKABLE.has(kind)) return null;
  const label = title.replace(/[[\]]/g, "").trim() || "Untitled";
  return `[${kind === "note" ? "" : "@"}${label}](athena://${kind}/${thing.id})`;
}
