import { Action, ActionPanel, Icon, List, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { Problem } from "./components/problem";
import { athena, currentSettings } from "./lib/athena";
import { dayLabel, deviceZone } from "./lib/dates";
import { mentionLink, pageFor } from "./lib/links";
import type { Occurrence, Upcoming } from "./lib/types";

const DAYS = 14;
const ICON: Record<string, Icon> = { birthday: Icon.Gift, anniversary: Icon.Heart, deadline: Icon.Flag, appointment: Icon.Clock };

/** "Turns 40" for a birthday, "12 years" for an anniversary. */
const yearsLine = (o: Occurrence) =>
  o.years == null ? "" : o.event.kind === "birthday" ? `Turns ${o.years}` : `${o.years} ${o.years === 1 ? "year" : "years"}`;

export default function Command() {
  const { data, isLoading, error, revalidate } = useCachedPromise(() => athena<Upcoming>("/api/upcoming", { query: { days: DAYS, tz: deviceZone() } }), [], {
    keepPreviousData: true,
    onError: () => undefined,
  });
  const checked = currentSettings();
  const origin = checked.ok ? checked.settings.origin : "";
  const events = error ? [] : (data?.events ?? []);
  const catchUps = error ? [] : (data?.catch_ups ?? []);
  const days = [...new Set(events.map((o) => o.occurs_on))];
  const refresh = <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={() => revalidate()} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter what's coming up">
      {error ? <Problem error={error} retry={revalidate} /> : <List.EmptyView icon={Icon.Calendar} title="Nothing in the next two weeks" />}
      {days.map((day) => (
        <List.Section key={day} title={dayLabel(day, data?.today ?? day)}>
          {events
            .filter((o) => o.occurs_on === day)
            .map((o) => {
              const link = mentionLink({ kind: "event", id: o.event.id }, o.event.title);
              return (
                <List.Item
                  key={`${o.event.id}:${o.occurs_on}`}
                  icon={ICON[o.event.kind] ?? Icon.Calendar}
                  title={o.event.title}
                  subtitle={yearsLine(o)}
                  accessories={[{ text: o.time ?? "All day" }]}
                  actions={
                    <ActionPanel>
                      <Action.OpenInBrowser title="Open in Athena" url={pageFor(origin, { kind: "event", id: o.event.id })} />
                      <Action.CopyToClipboard title="Copy Title" content={o.event.title} shortcut={Keyboard.Shortcut.Common.CopyName} />
                      {link && <Action.CopyToClipboard title="Copy Athena Link" content={link} shortcut={Keyboard.Shortcut.Common.CopyDeeplink} />}
                      {refresh}
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      ))}
      <List.Section title="Due a catch-up">
        {catchUps.map((person) => (
          <List.Item
            key={person.id}
            icon={Icon.Person}
            title={person.name}
            subtitle={person.relationship ?? ""}
            accessories={person.last_contacted_at ? [{ date: new Date(person.last_contacted_at), tooltip: "Last in touch" }] : []}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open in Athena" url={pageFor(origin, { kind: "person", id: person.id })} />
                <Action.CopyToClipboard title="Copy Name" content={person.name} shortcut={Keyboard.Shortcut.Common.CopyName} />
                {refresh}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
