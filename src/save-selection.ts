import { BrowserExtension, environment, getFrontmostApplication, getSelectedText, showHUD, showToast, Toast } from "@raycast/api";
import { tell } from "./lib/athena";
import { save } from "./lib/save";
import { asLink } from "./lib/urls";

/** The page the selection is on, when a browser is in front and Raycast's browser extension is installed. */
async function pageInFront(): Promise<{ url: string; title?: string } | null> {
  try {
    if (!environment.canAccess(BrowserExtension)) return null;
    const [app, tabs] = await Promise.all([getFrontmostApplication(), BrowserExtension.getTabs()]);
    const tab = tabs.find((t) => t.active);
    // getTabs answers whichever app is in front, so only trust it when that app is a browser.
    const browsers = /safari|chrome|chromium|arc|brave|edge|firefox|vivaldi|opera|orion|zen|dia/i;
    const url = asLink(tab?.url);
    return tab && url && browsers.test(app.name) ? { url, title: tab.title } : null;
  } catch {
    return null;
  }
}

export default async function Command() {
  let selection = "";
  try {
    selection = await getSelectedText();
  } catch {
    selection = "";
  }
  if (!selection.trim()) {
    await showToast({ style: Toast.Style.Failure, title: "Nothing selected", message: "Select some text first." });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Saving to Athena" });
  try {
    const page = await pageInFront();
    // A selected link is a link; anything else is kept word for word as a quote.
    const link = asLink(selection);
    await save(link ? { url: link } : { selection, source_url: page?.url, title: page?.title });
    await toast.hide();
    await showHUD(link ? "Saved the link" : page ? "Saved the quote and its page" : "Saved the quote");
  } catch (error) {
    await toast.hide();
    await tell(error, "Not saved");
  }
}
