import { Action, ActionPanel, Form, Icon, popToRoot, showHUD, showToast, Toast, useNavigation, type LaunchProps } from "@raycast/api";
import { useState } from "react";
import { athena, tell } from "./lib/athena";
import { localDate } from "./lib/dates";
import type { Commitment } from "./lib/types";

interface Values {
  title: string;
  due: Date | null;
  kind: string;
  notes: string;
}

/** The form on its own, so To-Dos can push it and get the new one back. */
export function AddTodoForm(props: { title?: string; onAdded?: (todo: Commitment) => void }) {
  const { pop } = useNavigation();
  const [titleError, setTitleError] = useState<string>();
  const [sending, setSending] = useState(false);

  async function submit(values: Values) {
    const title = values.title.trim();
    if (!title) {
      setTitleError("Say what there is to do.");
      return;
    }
    setSending(true);
    try {
      const todo = await athena<Commitment>("/api/commitments", {
        method: "POST",
        body: { title, kind: values.kind, due_on: values.due ? localDate(values.due) : null, notes: values.notes.trim() || undefined },
      });
      if (props.onAdded) {
        props.onAdded(todo);
        await showToast({ style: Toast.Style.Success, title: "Added", message: todo.title });
        pop();
      } else {
        await showHUD("Added to your to-dos");
        await popToRoot({ clearSearchBar: true });
      }
    } catch (error) {
      await tell(error, "Not added");
    } finally {
      setSending(false);
    }
  }

  return (
    <Form
      isLoading={sending}
      navigationTitle="Add To-Do"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Add To-Do" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="title"
        title="To-do"
        placeholder="Book the dentist"
        defaultValue={props.title}
        error={titleError}
        onChange={() => titleError && setTitleError(undefined)}
        autoFocus
      />
      <Form.DatePicker id="due" title="Due" type={Form.DatePicker.Type.Date} />
      <Form.Dropdown id="kind" title="Kind" defaultValue="todo">
        <Form.Dropdown.Item value="todo" title="To-do" icon={Icon.Circle} />
        <Form.Dropdown.Item value="i_owe" title="I owe someone" icon={Icon.ArrowRight} />
        <Form.Dropdown.Item value="waiting_on" title="Waiting on someone" icon={Icon.Hourglass} />
      </Form.Dropdown>
      <Form.TextArea id="notes" title="Notes" placeholder="Anything worth keeping with it" />
    </Form>
  );
}

export default function Command(props: LaunchProps<{ arguments: { title?: string } }>) {
  return <AddTodoForm title={props.arguments?.title || props.fallbackText || undefined} />;
}
