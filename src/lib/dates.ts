// Calendar dates as Athena sends them ("YYYY-MM-DD"), and how they read in
// a list. A date is never shifted between zones: the maths is done at noon UTC.

const at = (date: string) => new Date(`${date}T12:00:00Z`);

export function addDays(date: string, days: number): string {
  const d = at(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const daysBetween = (from: string, to: string) => Math.round((at(to).getTime() - at(from).getTime()) / 86_400_000);

/** The device's time zone, which Athena uses to decide what "today" is. */
export const deviceZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** A Date picked in a form, as the calendar date it shows on this device. */
export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Today", "Tomorrow", "Yesterday", "Thursday" within a week ahead, otherwise "Thu 12 Dec" (with the year when it isn't this one). */
export function dayLabel(date: string, today: string): string {
  const n = daysBetween(today, date);
  if (n === 0) return "Today";
  if (n === 1) return "Tomorrow";
  if (n === -1) return "Yesterday";
  const d = at(date);
  const weekday = WEEKDAYS[d.getUTCDay()];
  if (n > 1 && n < 7) return weekday;
  const year = date.slice(0, 4) === today.slice(0, 4) ? "" : ` ${d.getUTCFullYear()}`;
  return `${weekday.slice(0, 3)} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}${year}`;
}

export type DueGroup = "overdue" | "today" | "week" | "later" | "none";

export const DUE_GROUPS: Array<{ id: DueGroup; title: string }> = [
  { id: "overdue", title: "Overdue" },
  { id: "today", title: "Today" },
  { id: "week", title: "Next 7 days" },
  { id: "later", title: "Later" },
  { id: "none", title: "No date" },
];

export function dueGroup(dueOn: string | null, today: string): DueGroup {
  if (!dueOn) return "none";
  const n = daysBetween(today, dueOn);
  if (n < 0) return "overdue";
  if (n === 0) return "today";
  return n <= 7 ? "week" : "later";
}

/** Soonest first; within a day, higher priority first; undated last, in the order Athena sent them. */
export function byDue<T extends { due_on: string | null; priority?: number }>(items: T[]): T[] {
  return items
    .map((item, i) => ({ item, i }))
    .sort((a, b) => {
      if (a.item.due_on !== b.item.due_on) {
        if (!a.item.due_on) return 1;
        if (!b.item.due_on) return -1;
        return a.item.due_on < b.item.due_on ? -1 : 1;
      }
      return (b.item.priority ?? 0) - (a.item.priority ?? 0) || a.i - b.i;
    })
    .map(({ item }) => item);
}
