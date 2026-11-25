// The Raycast side of talking to Athena: reads the preferences, sends the
// request, and says what went wrong in a toast.

import { getPreferenceValues, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import { AthenaError, send, type RequestOptions } from "./api";
import { readSettings, type Checked, type Settings } from "./settings";

export function currentSettings(): Checked<{ settings: Settings }> {
  return readSettings(getPreferenceValues<{ address?: string; key?: string }>());
}

/** One request to the owner's Athena. Throws AthenaError. */
export async function athena<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await athenaSend<T>(path, options)).body;
}

/** The same, with the HTTP status. */
export async function athenaSend<T>(path: string, options: RequestOptions = {}): Promise<{ status: number; body: T }> {
  const checked = currentSettings();
  if (!checked.ok) throw new AthenaError("auth", checked.error);
  return send<T>(checked.settings, path, options);
}

/** True when the fix is in the extension's preferences. */
export const fixedInPreferences = (error: unknown) => error instanceof AthenaError && (error.failure === "auth" || error.failure === "scope");

export const messageOf = (error: unknown) => (error instanceof AthenaError ? error.message : "Something went wrong. Try again.");

/** A failure toast, with a way to the preferences when that's where the fix is. */
export async function tell(error: unknown, title = "Athena couldn't do that"): Promise<void> {
  // A request this extension cancelled itself isn't worth a toast.
  if (error instanceof Error && error.name === "AbortError") return;
  if (!(error instanceof AthenaError)) console.error(error);
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: messageOf(error),
    primaryAction: fixedInPreferences(error) ? { title: "Open Preferences", onAction: () => void openExtensionPreferences() } : undefined,
  });
}
