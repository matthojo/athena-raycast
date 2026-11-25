import { Action, ActionPanel, Color, Form, Icon, List, popToRoot, showHUD, showToast, Toast, Keyboard } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { Problem } from "./components/problem";
import { athena, currentSettings, tell } from "./lib/athena";
import type { Habit, HabitDay, Habits } from "./lib/types";

/** With a capture key nothing can be listed, so the habit is logged by name, as the iPhone Shortcut does. */
function LogByName() {
  const [nameError, setNameError] = useState<string>();
  const [sending, setSending] = useState(false);

  async function submit(values: { habit: string; count: string }) {
    const habit = values.habit.trim();
    if (!habit) {
      setNameError("Say which habit.");
      return;
    }
    setSending(true);
    try {
      const count = values.count.trim();
      const answer = await athena<{ message?: string }>("/api/habits/log", { method: "POST", body: { habit, ...(count ? { count } : {}) }, capture: true });
      await showHUD(answer.message || "Logged");
      await popToRoot({ clearSearchBar: true });
    } catch (error) {
      await tell(error, "Not logged");
    } finally {
      setSending(false);
    }
  }

  return (
    <Form
      isLoading={sending}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Log Habit" icon={Icon.CheckCircle} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description text="A capture key can't list your habits, so type the name. A full access key shows today's list to tick." />
      <Form.TextField id="habit" title="Habit" placeholder="Meditate" error={nameError} onChange={() => nameError && setNameError(undefined)} autoFocus />
      <Form.TextField id="count" title="How many" placeholder="1" info="For a habit with a target, like glasses of water. Leave empty to add one." />
    </Form>
  );
}

const progressLine = (habit: Habit, day: HabitDay) =>
  habit.target
    ? `${day.progress} of ${habit.target}${habit.unit ? ` ${habit.unit}` : ""}`
    : habit.per_week
      ? `${day.week_done ?? 0} of ${habit.per_week} this week`
      : "";

function TodayList() {
  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(() => athena<Habits>("/api/habits"), [], {
    keepPreviousData: true,
    onError: () => undefined,
  });
  const habits = error ? [] : (data?.habits ?? []).filter((h) => !h.archived_at);
  const dayOf = (id: string): HabitDay => data?.on.find((d) => d.id === id) ?? { id, progress: 0, done: false, shows: false, streak: 0, streak_unit: "day" };
  const due = habits.filter((h) => dayOf(h.id).shows);
  const rest = habits.filter((h) => !dayOf(h.id).shows);

  /** Sets today's count for a habit. 0 clears it. */
  async function set(habit: Habit, progress: number, said: string) {
    if (!data) return;
    try {
      await mutate(athena(`/api/habits/${habit.id}/days/${data.today}`, { method: "PUT", body: { progress } }), {
        optimisticUpdate: (now) =>
          now && {
            ...now,
            on: now.on.some((d) => d.id === habit.id)
              ? now.on.map((d) => (d.id === habit.id ? { ...d, progress, done: habit.target ? progress >= habit.target : progress > 0 } : d))
              : [...now.on, { ...dayOf(habit.id), progress, done: habit.target ? progress >= habit.target : progress > 0 }],
          },
      });
      await showToast({ style: Toast.Style.Success, title: said, message: habit.name });
    } catch (e) {
      await tell(e, "Not changed");
    }
  }

  const row = (habit: Habit) => {
    const day = dayOf(habit.id);
    const streak = day.streak > 1 ? `${day.streak} ${day.streak_unit}s` : "";
    return (
      <List.Item
        key={habit.id}
        icon={day.done ? { source: Icon.CheckCircle, tintColor: Color.Green } : day.progress > 0 ? Icon.CircleProgress50 : Icon.Circle}
        title={habit.name}
        subtitle={progressLine(habit, day)}
        accessories={streak ? [{ icon: Icon.Bolt, text: streak, tooltip: "Streak" }] : []}
        actions={
          <ActionPanel>
            {habit.target ? (
              <Action title="Add One" icon={Icon.Plus} onAction={() => set(habit, day.progress + 1, "Added one")} />
            ) : day.done ? (
              <Action title="Untick" icon={Icon.Circle} onAction={() => set(habit, 0, "Unticked")} />
            ) : (
              <Action title="Tick" icon={Icon.CheckCircle} onAction={() => set(habit, 1, "Ticked")} />
            )}
            {habit.target && !day.done && <Action title="Mark as Done" icon={Icon.CheckCircle} onAction={() => set(habit, habit.target ?? 1, "Done")} />}
            {habit.target && day.progress > 0 && (
              <Action
                title="Take One off"
                icon={Icon.Minus}
                shortcut={{ modifiers: ["cmd"], key: "-" }}
                onAction={() => set(habit, day.progress - 1, "Took one off")}
              />
            )}
            {habit.target && day.progress > 0 && <Action title="Clear Today" icon={Icon.XMarkCircle} onAction={() => set(habit, 0, "Cleared")} />}
            <Action.OpenInBrowser title="Open Habits in Athena" url={`${origin()}/#/habits`} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} shortcut={Keyboard.Shortcut.Common.Refresh} onAction={() => revalidate()} />
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter habits">
      {error ? (
        <Problem error={error} retry={revalidate} />
      ) : (
        <List.EmptyView icon={Icon.CheckCircle} title="No habits yet" description="Make one in Athena under Library → Habits." />
      )}
      <List.Section title="Today">{due.map(row)}</List.Section>
      <List.Section title="Not due today">{rest.map(row)}</List.Section>
    </List>
  );
}

function origin(): string {
  const checked = currentSettings();
  return checked.ok ? checked.settings.origin : "";
}

export default function Command() {
  const checked = currentSettings();
  return checked.ok && checked.settings.scope === "capture" ? <LogByName /> : <TodayList />;
}
