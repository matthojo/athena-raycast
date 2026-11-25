import { BrowserExtension, Clipboard, environment, getSelectedText, showHUD, showToast, Toast, type LaunchProps } from "@raycast/api";
import { tell } from "./lib/athena";
import { save } from "./lib/save";
import { pickLink } from "./lib/urls";

/** The tab in front, when Raycast's browser extension is installed. */
async function frontTab() {
  if (!environment.canAccess(BrowserExtension)) return null;
  const tabs = await BrowserExtension.getTabs();
  return tabs.find((tab) => tab.active) ?? null;
}

const FROM = { typed: "", selection: " from the selection", browser: " from the browser", clipboard: " from the clipboard" } as const;

export default async function Command(props: LaunchProps<{ arguments: { url?: string } }>) {
  const typed = (props.arguments.url || props.fallbackText || "").trim();
  const link = await pickLink({ typed, selection: getSelectedText, tab: frontTab, clipboard: Clipboard.readText });
  if (!link) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No link to save",
      message: typed ? "That doesn't look like a link." : "Type one, select one, or copy one first.",
    });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Athena", message: link.url });
  try {
    const saved = await save({ url: link.url, title: link.title });
    const name = saved.item?.title || new URL(link.url).hostname;
    await toast.hide();
    await showHUD(saved.created ? `Saved “${name}”${FROM[link.from]}` : `“${name}” was already in Saved`);
  } catch (error) {
    await toast.hide();
    await tell(error, "Not saved");
  }
}
