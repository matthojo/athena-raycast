# Working on Athena for Raycast

This repository is public: everything committed here is published, history
included.

- **No real data.** No real person, account, place or site in code, tests,
  docs, screenshots or commit messages. Use made-up people, `example.com`
  addresses and `athena.example.com` for an Athena address. Screenshots come
  from an Athena running in sample data, never a signed-in copy.
- **It only talks to the owner's Athena.** No analytics, no third-party
  requests. The key goes to the address in the preferences and nowhere else.
- **Reads need a full access key; adding works with a capture key.** A
  request that isn't on a capture path must not be sent with a capture key
  (`src/lib/api.ts` stops it).
- **Permissive dependencies only** (MIT, BSD, Apache-2.0, ISC).
- When what the extension calls, stores or sends changes, update the
  "Privacy" section of `README.md`, and Athena's `SECURITY.md` in
  `matthojo/athena`.

Before you push:

```sh
npm run typecheck && npm test && npm run build
```
