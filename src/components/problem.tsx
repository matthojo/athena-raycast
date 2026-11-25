import { Action, ActionPanel, Icon, List, openExtensionPreferences } from "@raycast/api";
import { fixedInPreferences, messageOf } from "../lib/athena";

/** What a list shows when Athena couldn't answer, with the fix one key away. */
export function Problem(props: { error: unknown; retry?: () => void }) {
  const inPreferences = fixedInPreferences(props.error);
  return (
    <List.EmptyView
      icon={inPreferences ? Icon.Key : Icon.WifiDisabled}
      title={inPreferences ? "Check the extension's preferences" : "Athena didn't answer"}
      description={messageOf(props.error)}
      actions={
        <ActionPanel>
          {inPreferences ? (
            <Action title="Open Preferences" icon={Icon.Gear} onAction={() => void openExtensionPreferences()} />
          ) : (
            props.retry && <Action title="Try Again" icon={Icon.ArrowClockwise} onAction={props.retry} />
          )}
          {!inPreferences && <Action title="Open Preferences" icon={Icon.Gear} onAction={() => void openExtensionPreferences()} />}
        </ActionPanel>
      }
    />
  );
}
