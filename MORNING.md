# Good morning

Running log from the overnight build. Kept current as I go; the final version is at the bottom of the night.

## Status

| App | Folder | Status |
|---|---|---|
| 1. Rewater: verified water savings sold to Big Tech | `rewater/` | Engine + web app done, tested, pushed |
| 2. Verified activity record | `vouched/` | In progress |
| 3. AI-agent booking for shops with no software | — | Not started |

All work is on the branch `claude/three-ventures` (not `main`). Nothing is deployed or sent anywhere.

## Decisions I made for you

1. **Deleted the old T-rex game** from the repo, as you said it could go. It's still in git history if you ever want it.
2. **Working names**: Rewater (app 1), Vouched (app 2). Easy to rename later; only `src/config/site.ts` and the README carry them.
3. **One repo, one folder per app.** Each deploys separately on Vercel by setting Root Directory to its folder. We can split
   into separate repos whenever you want.
4. **Stack**: Next.js 16, React 19, TypeScript 5.9, Tailwind 4, Vitest. Pinned TypeScript to 5.9 because the newest (7.x)
   doesn't work with Next's build yet.
5. **No real data anywhere.** Every demo number is simulated and labeled that way on the page.
6. **Pushed a branch, no pull request**, so nothing on `main` changes until you say so.

## Questions for you

(Each has the default I assumed, so "keep the default" is a fine answer.)

1. **Rewater contact email** for the "Pilot with us" button. Default: button hidden until you give one.

## Skills I wrote (in `.claude/skills/`)

- `venture-conventions`: stack, layout, colors, data honesty, privacy rules for minors, pitfalls.
- `ship-check`: typecheck, test, build, serve, screenshot, and catch browser errors before calling anything done.
- `new-venture-app`: scaffold a new app folder with everything pre-set.
- `market-check`: check if an idea exists before building, and phrase claims honestly.
- `morning-handoff`: how I work while you're away and how this file is structured.
