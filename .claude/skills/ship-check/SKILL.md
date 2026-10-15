---
name: ship-check
description: Prove a venture app in this repo works before committing or calling it done. Runs typecheck, unit tests and the production build, starts the built app, takes desktop / phone / dark-mode screenshots, and reports browser console errors and horizontal overflow. Use after any UI or logic change to rewater/ or a sibling app, before every commit that touches UI, and whenever someone asks "does it work".
---

# Ship check

A change is done when all five steps pass and you have looked at the screenshots. Passing tests alone is not done.

## 1. Static checks (from the app folder)

```bash
npx tsc --noEmit
npx vitest run
NEXT_TELEMETRY_DISABLED=1 npx next build
```

Fix every error. Do not skip or weaken a test to get green.

## 2. Serve the build

```bash
.claude/skills/ship-check/scripts/serve.sh <app-folder> <port>
```

Use a distinct port per app (rewater 3101, the second app 3102, the third 3103). `serve.sh` stops any older server
started from the same folder first. Never use `pkill -f` with a pattern that appears in your own command line.
Stop it afterwards with `scripts/stop.sh <app-folder>`.

## 3. Screenshots and runtime errors

Write a config JSON in the scratchpad, then run `scripts/shoot.sh <config.json>`:

```json
{
  "base": "http://localhost:3101",
  "out": "/path/to/scratchpad/shots/rewater",
  "shots": [
    { "name": "home", "path": "/" },
    { "name": "home-dark", "path": "/", "scheme": "dark" },
    { "name": "home-phone", "path": "/", "width": 390, "height": 844 },
    { "name": "flow", "path": "/verify", "steps": [{ "click": "Run demo verification" }, { "wait": 1500 }] },
    { "name": "hover", "path": "/verify", "fullPage": false,
      "steps": [{ "click": "Run demo" }, { "wait": 1500 }, { "hover": "figure svg[role=img]", "position": { "x": 400, "y": 120 } }] }
  ]
}
```

Step types: `click` (visible text, or `css=<selector>`), `fill` (`[selector, value]`), `hover` (selector, optional
`position`), `wait` (ms). The script waits for hydration before the first step.

It prints `ok` or `WARN` per shot. `WARN` lines list console errors, uncaught page errors, and horizontal overflow
in px. Any `WARN` is a bug to fix (a missing `icon.svg` shows up as a 404 console error).

Cover at least: every route at desktop, the main route in dark mode, every route at 390px, and the main
interactive flow driven through to its result.

## 4. Look at the screenshots

Open the PNGs with the Read tool. Check for clipped labels, overlapping text, empty states, wrong colors in dark mode,
and anything that looks unfinished. Crop tall phone screenshots with PIL if needed so details are legible.

## 5. Drive the critical flow as a user would

Each app keeps its flow scripts in `<app>/e2e/*.mjs` (rewater: CSV upload; vouched: student → verifier → reader;
doorbell: assistant demo, owner setup, public booking). Run one against a served build:

```bash
.claude/skills/ship-check/scripts/run-e2e.sh vouched/e2e/flow.mjs http://localhost:3102
```

Each prints numbered observations and ends with `errors: none` (Vouched also lists one intended 404 from a revoked
link). For new flows, copy one of these: real clicks and form fills, at least one validation error, and multiple
browser contexts when more than one person is involved.

## Known failure modes

- Buttons do nothing: a stale server from an old build still holds the port and its JS chunks return 500.
  `serve.sh` prevents it; check the server log if it recurs.
- Chart wider than the phone: a grid or flex child without `min-w-0`, or a chart that rendered at its fallback width.
- Click had no effect in a script: it landed before hydration. Wait about 1s after load.
- Playwright "strict mode violation": the text appears twice (e.g. a card and a message preview). Scope the locator
  (`page.locator("article", { hasText: "..." })`) instead of loosening the check.
- A 4xx console error on a signed-out page: the page treats "signed out" as an error. Return 200 with a flag.
- `serve.sh` killed your own shell (exit 144) in older versions: it matched any process in the app folder with "next"
  in its command line. The current script only matches real Next servers and skips its own ancestors.

## API-first apps

When the product has a machine interface (MCP, REST, webhooks), test it the way an outside client would, with
`curl` against the running server: the protocol handshake, one success per operation, malformed input, wrong
method (405), CORS preflight, and signed vs. forged webhook payloads. See `doorbell/README.md` for an example.
