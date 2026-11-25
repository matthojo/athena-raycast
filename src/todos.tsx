import { Action, ActionPanel, Color, Icon, List, showToast, Toast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { AddTodoForm } from "./add-todo";
import { Problem } from "./components/problem";
import { athena, currentSettings, tell } from "./lib/athena";
import { addDays, byDue, dayLabel, deviceZone, DUE_GROUPS, dueGroup } from "./lib/dates";
import { mentionLink, pageFor } from "./lib/links";
import type { Commitment, Today } from "./lib/types";

const KIND: Record<string, string> = { i_owe: "I owe", waiting_on: "Waiting on" };
const PRIORITY: Array<{ icon: Icon; tooltip: string; color: Color } | null> = [
  null,
  { icon: Icon.Flag, tooltip: "Low priority", color: Color.SecondaryText },
  { icon: Icon.Flag, tooltip: "Medium priority", color: Color.Orange },
  { icon: Icon.Flag, tooltip: "High priority", color: Color.Red },
];

export default function Command() {
  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(() => athena<Today>("/api/today", { query: { tz: deviceZone() } }), [], {
    keepPreviousData: true,
    onError: () => undefined,
  });
  const checked = currentSettings();
  const origin = checked.ok ? checked.settings.origin : "";
  const today = data?.today ?? "";
  const open = error ? [] : byDue(data?.open_loops ?? []);

  /** Sends a change and shows it straight away; the list goes back if Athena refuses. */
  async function change(todo: Commitment, patch: Partial<Pick<Commitment, "status" | "due_on">>, done: string) {
    const toast = await showToast({ style: Toast.Style.Animated, title: "Telling Athena" });
    try {
      await mutate(athena(`/api/commitments/${todo.id}`, { method: "PATCH", body: patch }), {
        optimisticUpdate: (now) =>
          now && {
            ...now,
            open_loops: now.open_loops.map((c) => (c.id === todo.id ? { ...c, ...patch } : c)).filter((c) => c.status === "open"),
          },
      });
      toast.style = Toast.Style.Success;
      toast.title = done;
      toast.message = todo.title;
      if (patch.status) {
        toast.primaryAction = {
          title: "Undo",
          onAction: () => void mutate(athena(`/api/commitments/${todo.id}`, { method: "PATCH", body: { status: "open" } })).catch((e) => tell(e)),
        };
      }
    } catch (e) {
      await toast.hide();
      await tell(e, "Not changed");
    }
  }

  const add = <Action.Push title="Add To-Do" icon={Icon.Plus} shortcut={Keyboard.Shortcut.Common.New} target={<AddTodoForm onAdded={() => revalidate()} />} />;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter to-dos" actions={<ActionPanel>{add}</ActionPanel>}>
      {error ? (
        <Problem error={error} retry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.CheckCircle} title="Nothing open" description="Press ⌘N to add a to-do." actions={<ActionPanel>{add}</ActionPanel>} />
      )}
      {DUE_GROUPS.map((group) => {
        const items = open.filter((c) => dueGroup(c.due_on, today) === group.id);
        return (
          <List.Section key={group.id} title={group.title} subtitle={String(items.length)}>
            {items.map((todo) => {
              const priority = PRIORITY[todo.priority] ?? null;
              const link = mentionLink({ kind: "todo", id: todo.id }, todo.title);
              return (
                <List.Item
                  key={todo.id}
                  icon={{ source: Icon.Circle, tintColor: group.id === "overdue" ? Color.Red : Color.SecondaryText }}
                  title={todo.title}
                  subtitle={[KIND[todo.kind], todo.person?.name].filter(Boolean).join(" ")}
                  keywords={[todo.person?.name ?? "", todo.notes].filter(Boolean)}
                  accessories={[
                    ...(priority ? [{ icon: { source: priority.icon, tintColor: priority.color }, tooltip: priority.tooltip }] : []),
                    ...(todo.due_on ? [{ text: { value: dayLabel(todo.due_on, today), color: group.id === "overdue" ? Color.Red : undefined } }] : []),
                  ]}
                  actions={
                    <ActionPanel>
                      <Action title="Mark as Done" icon={Icon.CheckCircle} onAction={() => change(todo, { status: "done" }, "Done")} />
                      <Action.OpenInBrowser title="Open To-Dos in Athena" url={pageFor(origin, { kind: "todo", id: todo.id })} />
                      <ActionPanel.Section title="Move">
                        <Action
                          title="Due Today"
                          icon={Icon.Calendar}
                          shortcut={{ modifiers: ["cmd"], key: "t" }}
                          onAction={() => change(todo, { due_on: today }, "Due today")}
                        />
                        <Action
                          title="Due Tomorrow"
                          icon={Icon.ArrowRight}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                          onAction={() => change(todo, { due_on: addDays(today, 1) }, "Due tomorrow")}
                        />
                        <Action
                          title="Due in a Week"
                          icon={Icon.ArrowRightCircle}
                          shortcut={{ modifiers: ["cmd", "shift"], key: "w" }}
                          onAction={() => change(todo, { due_on: addDays(today, 7) }, "Due in a week")}
                        />
                        {todo.due_on && (
                          <Action title="Remove the Date" icon={Icon.XMarkCircle} onAction={() => change(todo, { due_on: null }, "Date removed")} />
                        )}
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        {add}
                        <Action
                          title="Drop It"
                          icon={Icon.Trash}
                          style={Action.Style.Destructive}
                          shortcut={{ modifiers: ["ctrl"], key: "x" }}
                          onAction={() => change(todo, { status: "dropped" }, "Dropped")}
                        />
                        <Action.CopyToClipboard title="Copy Title" content={todo.title} shortcut={Keyboard.Shortcut.Common.CopyName} />
                        {link && <Action.CopyToClipboard title="Copy Athena Link" content={link} shortcut={Keyboard.Shortcut.Common.CopyDeeplink} />}
                        <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={() => revalidate()} />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
