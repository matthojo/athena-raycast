import { Action, ActionPanel, Form, Icon, popToRoot, showHUD, showToast, Toast, type LaunchProps } from "@raycast/api";
import { useState } from "react";
import { athena, tell } from "./lib/athena";
import type { Captured } from "./lib/types";

interface Values {
  text: string;
}

/** Sends text to Athena's capture, which files it and answers with one line ("Added a to-do."). */
export async function capture(text: string): Promise<string> {
  const answer = await athena<Captured>("/api/assistant/capture", {
    method: "POST",
    query: { format: "json" },
    body: { text },
    capture: true,
    timeout: 60_000,
  });
  return answer.reply || "Captured.";
}

export default function Command(props: LaunchProps<{ arguments: { text?: string }; draftValues: Values }>) {
  // Typed after the command's name, kept as a draft, or sent from root search as a fallback.
  const [text, setText] = useState(props.arguments?.text || props.draftValues?.text || props.fallbackText || "");
  const [error, setError] = useState<string>();
  const [sending, setSending] = useState(false);

  async function submit(values: Values) {
    const said = values.text.trim();
    if (!said) {
      setError("Write something to capture.");
      return;
    }
    setSending(true);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Sending to Athena" });
    try {
      const reply = await capture(said);
      await toast.hide();
      setText("");
      await showHUD(reply);
      await popToRoot({ clearSearchBar: true });
    } catch (e) {
      await toast.hide();
      await tell(e, "Not captured");
    } finally {
      setSending(false);
    }
  }

  return (
    <Form
      enableDrafts
      isLoading={sending}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Capture" icon={Icon.Plus} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Capture"
        placeholder="Call the dentist on Friday. Priya's new address is 12 Example Street."
        info="Athena files this as a to-do, a note, a date or a detail about someone. A link goes to Saved."
        value={text}
        error={error}
        onChange={(value) => {
          setText(value);
          if (error) setError(undefined);
        }}
        autoFocus
      />
    </Form>
  );
}
