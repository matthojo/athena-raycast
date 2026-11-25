import { showHUD, showToast, Toast, type LaunchProps } from "@raycast/api";
import { capture } from "./capture";
import { tell } from "./lib/athena";

export default async function Command(props: LaunchProps<{ arguments: { text: string } }>) {
  const text = (props.arguments.text || props.fallbackText || "").trim();
  if (!text) {
    await showToast({ style: Toast.Style.Failure, title: "Nothing to capture", message: "Type something after the command's name." });
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: "Sending to Athena" });
  try {
    const reply = await capture(text);
    await toast.hide();
    await showHUD(reply);
  } catch (error) {
    await toast.hide();
    await tell(error, "Not captured");
  }
}
