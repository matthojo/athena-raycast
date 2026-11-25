# Athena for Raycast

Capture to, search and tick things off in your own [Athena](https://github.com/matthojo/athena) from [Raycast](https://www.raycast.com). It talks to one host: the Athena address you give it.

## Commands

| Command | What it does | Key it needs |
|---|---|---|
| **Capture** | A text box. Athena files what you write as a to-do, a note, a date or a detail about someone, and answers with one line ("Added a to-do."). A link goes to Saved. | Capture |
| **Quick Capture** | The same from one line typed after the command's name. No window. | Capture |
| **Save Link** | Saves a link to Saved: the one you typed, else a selected link, else the browser tab in front, else a link on the clipboard. | Capture |
| **Save Selection** | Saves the selected text as a quote, word for word, with the page it's on when a browser is in front. | Capture |
| **Habits** | Today's habits with their streaks, to tick, count up or clear. With a capture key it's a form that logs one by name. | Capture or full |
| **Search Athena** | People, notes, to-dos, places, events, saved things, your own records and days. Title matches first, then things whose text matches. Empty, it shows what you touched lately. | Full |
| **To-Dos** | What's open, grouped Overdue, Today, Next 7 days, Later and No date. Mark as done (with Undo), move the date, drop it, add one. | Full |
| **Add To-Do** | A to-do with a date, kept exactly as typed. Capture hands your words to Athena's assistant; this doesn't. | Full |
| **Coming up** | Events, birthdays and deadlines in the next two weeks, and people due a catch-up. | Full |
| **Athena Menu Bar** | How many to-dos are due, in the menu bar. Click one to open To-Dos, or hold ⌥ and click to mark it done. Also shows today's and tomorrow's events. Refreshes every 15 minutes. | Full |

Capture, Quick Capture, Save Link and Add To-Do can be set as fallback commands in Raycast's settings, so whatever you typed into Raycast's search goes to them.

Save Link and Save Selection read the browser's tab through [Raycast's browser extension](https://www.raycast.com/browser-extension). Without it, Save Link uses the selection or the clipboard, and Save Selection saves the quote without its page.

## Install

Needs Node 22 and Raycast. It isn't in the Raycast Store, so it runs from a copy of this repository:

```sh
git clone https://github.com/matthojo/athena-raycast
cd athena-raycast
npm install
npm run dev      # adds "Athena" to Raycast and rebuilds as you edit
```

Stop `npm run dev` when you like: the extension stays in Raycast. Run it again after pulling changes.

## Set up

Raycast asks for two things the first time you run a command:

1. **Athena Address**: where your Athena lives, for example `https://athena.example.com`. It has to be `https://` (plain `http` works for `localhost` only).
2. **API Key**: make one in Athena under Settings → API keys.
   - A **capture** key (`athc_…`) can only add things. It can't read anything back, so Search, To-Dos, Coming up and the menu bar stay shut.
   - A **full access** key (`athk_…`) opens every command. It can read and change everything the app can, so make one for Raycast alone, label it "Raycast", and remove it in Athena if this Mac is lost.

A Claude only key (`athm_…`) is turned away, and the access token never needs pasting here.

## Privacy

- Talks to one host: the Athena address you set. Redirects are refused, so the key can't follow one somewhere else.
- No analytics and no third-party requests.
- The key is a Raycast password preference, kept by Raycast in its own storage on this Mac. It isn't synced by this extension.
- Search, To-Dos, Coming up, Habits and the menu bar keep their last answer in Raycast's local cache for this extension, so a list shows at once while it reloads. That's a copy of some titles, dates and names on this Mac, outside Athena's encryption. Removing the extension from Raycast removes it. With a capture key nothing is read, so nothing is kept.
- Save Link reads the selection, then the tab in front, then the clipboard, and stops at the first link it finds. The clipboard isn't read when a tab will do.

## Checks

```sh
npm run typecheck
npm test           # settings, the request builder, dates, links and search merging
npm run build      # Raycast's own build
npm run lint       # Raycast's manifest check, ESLint and Prettier
```

`npm run lint` asks raycast.com whether `author` in `package.json` is a Raycast username, so it needs a network connection, and it fails until that's set to yours.

## Publishing to the Raycast Store

Not done. Before it could be:

- `author` in `package.json` must be your Raycast username (it's a placeholder now).
- The Store wants screenshots in `metadata/`. Take them against an Athena running in sample data, never a signed-in copy.

## Licence

[MIT](LICENSE). Athena itself is a separate project under the AGPL. This extension shares no code with it and talks to it only over its REST API.
