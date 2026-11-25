import assert from "node:assert/strict";
import { test } from "node:test";
import { addDays, byDue, dayLabel, daysBetween, dueGroup, localDate } from "../src/lib/dates";
import { mentionLink, pageFor } from "../src/lib/links";
import { mergeResults } from "../src/lib/search";
import { asLink, pickLink } from "../src/lib/urls";

const ID = "5a3e5a7e-0000-4000-8000-00000000b001";
const ORIGIN = "https://athena.example.com";

test("dates move by calendar day, across months and leap days", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
  assert.equal(daysBetween("2026-11-25", "2026-12-02"), 7);
  assert.equal(localDate(new Date(2026, 0, 5, 23, 30)), "2026-01-05");
});

test("a day reads the way you'd say it", () => {
  const today = "2026-11-25"; // a Wednesday
  assert.equal(dayLabel("2026-11-25", today), "Today");
  assert.equal(dayLabel("2026-11-26", today), "Tomorrow");
  assert.equal(dayLabel("2026-11-24", today), "Yesterday");
  assert.equal(dayLabel("2026-11-28", today), "Saturday");
  assert.equal(dayLabel("2026-12-12", today), "Sat 12 Dec");
  assert.equal(dayLabel("2027-01-04", today), "Mon 4 Jan 2027");
  assert.equal(dayLabel("2026-11-20", today), "Fri 20 Nov");
});

test("to-dos fall into the right group", () => {
  const today = "2026-11-25";
  assert.equal(dueGroup(null, today), "none");
  assert.equal(dueGroup("2026-11-24", today), "overdue");
  assert.equal(dueGroup("2026-11-25", today), "today");
  assert.equal(dueGroup("2026-12-02", today), "week");
  assert.equal(dueGroup("2026-12-03", today), "later");
});

test("to-dos sort soonest first, then by priority, undated last", () => {
  const sorted = byDue([
    { id: "none", due_on: null, priority: 3 },
    { id: "later", due_on: "2026-12-01", priority: 0 },
    { id: "low", due_on: "2026-11-25", priority: 1 },
    { id: "high", due_on: "2026-11-25", priority: 3 },
  ]);
  assert.deepEqual(
    sorted.map((t) => t.id),
    ["high", "low", "later", "none"],
  );
});

test("each kind opens where it lives in the app", () => {
  assert.equal(pageFor(ORIGIN, { kind: "person", id: ID }), `${ORIGIN}/#/people/${ID}`);
  assert.equal(pageFor(ORIGIN, { kind: "note", id: ID }), `${ORIGIN}/#/notes/${ID}`);
  assert.equal(pageFor(ORIGIN, { kind: "saved", id: ID }), `${ORIGIN}/#/saved/${ID}`);
  assert.equal(pageFor(ORIGIN, { kind: "day", id: "2026-11-25" }), `${ORIGIN}/#/days/2026-11-25`);
  assert.equal(pageFor(ORIGIN, { kind: "record", id: ID, kindId: "wines" }), `${ORIGIN}/#/kind/wines/${ID}`);
  assert.equal(pageFor(ORIGIN, { kind: "record", id: ID }), `${ORIGIN}/#/library`);
  assert.equal(pageFor(ORIGIN, { kind: "commitment", id: ID }), `${ORIGIN}/#/loops`);
  assert.equal(pageFor(ORIGIN, { kind: "fact", id: "x", person: { id: ID, name: "Priya Shah" } }), `${ORIGIN}/#/people/${ID}`);
  assert.equal(pageFor(ORIGIN, { kind: "something-new", id: ID }), `${ORIGIN}/#/`);
});

test("an Athena link is the one notes use", () => {
  assert.equal(mentionLink({ kind: "person", id: ID }, "Priya Shah"), `[@Priya Shah](athena://person/${ID})`);
  assert.equal(mentionLink({ kind: "note", id: ID }, "Q3 [planning]"), `[Q3 planning](athena://note/${ID})`);
  assert.equal(mentionLink({ kind: "commitment", id: ID }, "Book the dentist"), `[@Book the dentist](athena://todo/${ID})`);
  assert.equal(mentionLink({ kind: "day", id: "2026-11-25" }, "Wednesday"), null);
});

test("search shows a thing once, title matches first", () => {
  const rows = mergeResults(
    [
      { kind: "todo", id: ID, title: "Book the dentist", subtitle: "To do · due Fri", updated_at: "2026-11-24T10:00:00Z" },
      { kind: "person", id: "p1", title: "Priya Shah", subtitle: "Sister", updated_at: "2026-11-20T10:00:00Z" },
    ],
    [
      { kind: "commitment", id: ID, title: "Book the dentist", snippet: "the dentist on Example Street", at: "2026-11-24T10:00:00Z", person: null },
      { kind: "fact", id: "f1", title: "Dentist", snippet: "Uses the practice on Example Street", at: "2026-11-01T10:00:00Z", person: { id: "p1", name: "Priya Shah" } },
      { kind: "record", id: "r1", title: "Château Musar", snippet: "2018", at: "2026-10-01T10:00:00Z", person: null, custom_kind: { id: "wines", one: "wine" } },
    ],
  );
  assert.deepEqual(
    rows.map((r) => [r.key, r.section, r.label]),
    [
      [`todo:${ID}`, "titles", "To-do"],
      ["person:p1", "titles", "Person"],
      ["fact:f1", "text", "About Priya Shah"],
      ["record:r1", "text", "Wine"],
    ],
  );
  assert.equal(rows[3].kindId, "wines");
});

test("a link is a link; a file name isn't", () => {
  assert.equal(asLink("https://example.com/a?b=1"), "https://example.com/a?b=1");
  assert.equal(asLink("www.example.com"), "https://www.example.com/");
  assert.equal(asLink("notes.txt"), null);
  assert.equal(asLink("example.com/page", true), "https://example.com/page");
  assert.equal(asLink("two words"), null);
  assert.equal(asLink("javascript:alert(1)"), null);
  assert.equal(asLink("mailto:someone@example.com", true), null);
});

test("the link saved is the first one to hand, and later sources aren't read", async () => {
  let clipboardRead = false;
  const sources = {
    selection: async () => "just some words",
    tab: async () => ({ url: "https://example.com/article", title: "An article" }),
    clipboard: async () => {
      clipboardRead = true;
      return "https://example.com/copied";
    },
  };
  assert.deepEqual(await pickLink({ ...sources, typed: "example.com/typed" }), { url: "https://example.com/typed", from: "typed" });
  assert.deepEqual(await pickLink(sources), { url: "https://example.com/article", title: "An article", from: "browser" });
  assert.equal(clipboardRead, false);
  const noTab = { ...sources, tab: async () => null };
  assert.deepEqual(await pickLink(noTab), { url: "https://example.com/copied", from: "clipboard" });
  const broken = {
    selection: async () => {
      throw new Error("nothing selected");
    },
    tab: async () => {
      throw new Error("no browser extension");
    },
    clipboard: async () => "not a link",
  };
  assert.equal(await pickLink(broken), null);
});
