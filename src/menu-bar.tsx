import { Icon, Keyboard, launchCommand, LaunchType, MenuBarExtra, open, openExtensionPreferences, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { athena, currentSettings, messageOf } from "./lib/athena";
import { byDue, dayLabel, deviceZone } from "./lib/dates";
import { pageFor } from "./lib/links";
import type { Commitment, Today, Upcoming } from "./lib/types";

const MOST = 8;

async function load() {
  const tz = deviceZone();
  const [today, upcoming] = await Promise.all([
    athena<Today>("/api/today", { query: { tz } }),
    // Today and tomorrow only: the menu bar is for what's close.
    athena<Upcoming>("/api/upcoming", { query: { days: 1, tz } }),
  ]);
  return { today, upcoming };
}

const run = (name: string) => () => void launchCommand({ name, type: LaunchType.UserInitiated }).catch(() => undefined);

export default function Command() {
  const checked = currentSettings();
  const full = checked.ok && checked.settings.scope === "full";
  const { data, isLoading, error, mutate } = useCachedPromise(load, [], { execute: full, keepPreviousData: true, onError: () => undefined });
  const origin = checked.ok ? checked.settings.origin : "";
  const due = byDue(data?.today.due ?? []);
  const events = data?.upcoming.events ?? [];
  const today = data?.today.today ?? "";

  // Raycast unloads a menu bar command once it stops loading, so stay busy until Athena has answered.
  const [busy, setBusy] = useState(false);
  const done = async (todo: Commitment) => {
    setBusy(true);
    try {
      await mutate(athena(`/api/commitments/${todo.id}`, { method: "PATCH", body: { status: "done" } }), {
        optimisticUpdate: (now) => now && { ...now, today: { ...now.today, due: now.today.due.filter((c) => c.id !== todo.id) } },
      });
      await showHUD(`Done: ${todo.title}`);
    } catch (e) {
      await showHUD(`Not marked as done. ${messageOf(e)}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <MenuBarExtra icon={{ source: "icon.png" }} title={due.length ? String(due.length) : undefined} tooltip="Athena" isLoading={isLoading || busy}>
      {!checked.ok && <MenuBarExtra.Item title={checked.error} icon={Icon.Key} onAction={() => void openExtensionPreferences()} />}
      {checked.ok && !full && (
        <MenuBarExtra.Item title="Add a full access key to see what's due" icon={Icon.Key} onAction={() => void openExtensionPreferences()} />
      )}
      {full && error && !data && <MenuBarExtra.Item title={messageOf(error)} icon={Icon.WifiDisabled} />}
      {full && data && (
        <>
          <MenuBarExtra.Section title={due.length ? "Due" : "Nothing due today"}>
            {due.slice(0, MOST).map((todo) => (
              <MenuBarExtra.Item
                key={todo.id}
                icon={Icon.Circle}
                title={todo.title}
                subtitle={todo.due_on && todo.due_on < today ? dayLabel(todo.due_on, today) : undefined}
                tooltip="Click to mark as done"
                onAction={() => done(todo)}
              />
            ))}
            {due.length > MOST && <MenuBarExtra.Item title={`${due.length - MOST} more…`} onAction={run("todos")} />}
          </MenuBarExtra.Section>
          {events.length > 0 && (
            <MenuBarExtra.Section title="On">
              {events.slice(0, MOST).map((o) => (
                <MenuBarExtra.Item
                  key={`${o.event.id}:${o.occurs_on}`}
                  icon={Icon.Calendar}
                  title={o.event.title}
                  subtitle={[o.days_until === 0 ? "" : dayLabel(o.occurs_on, today), o.time ?? ""].filter(Boolean).join(" ")}
                  onAction={() => void open(pageFor(origin, { kind: "event", id: o.event.id }))}
                />
              ))}
            </MenuBarExtra.Section>
          )}
        </>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item title="Capture…" icon={Icon.Plus} shortcut={Keyboard.Shortcut.Common.New} onAction={run("capture")} />
        {full && <MenuBarExtra.Item title="To-Dos" icon={Icon.CheckCircle} onAction={run("todos")} />}
        {full && <MenuBarExtra.Item title="Search Athena" icon={Icon.MagnifyingGlass} onAction={run("search")} />}
        {origin && <MenuBarExtra.Item title="Open Athena" icon={Icon.Globe} onAction={() => void open(origin)} />}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
