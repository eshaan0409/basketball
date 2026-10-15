# Good morning

Running log from the overnight build. Kept current as I go.

## Status

| App | Folder | Status |
|---|---|---|
| 1. Rewater: verified water savings sold to Big Tech | `rewater/` | Engine + web app done, tested, pushed |
| 2. Vouched: activities verified at the source | `vouched/` | Done: student record, verifier flow, shared records, tested end to end, pushed |
| 3. AI-agent booking for shops with no software | `doorbell/` | In progress |

All work is on the branch `claude/three-ventures` (not `main`). Nothing is deployed or sent anywhere.

## Decisions I made for you

1. **Deleted the old T-rex game** from the repo, as you said it could go. It's still in git history if you ever want it.
2. **Working names**: Rewater (app 1), Vouched (app 2), Doorbell (app 3). Easy to rename later; only
   `src/config/site.ts` and the README carry them.
3. **One repo, one folder per app.** Each deploys separately on Vercel by setting Root Directory to its folder. We can split
   into separate repos whenever you want.
4. **Stack**: Next.js 16, React 19, TypeScript 5.9, Tailwind 4, Vitest. Pinned TypeScript to 5.9 because the newest (7.x)
   doesn't work with Next's build yet.
5. **No real data anywhere.** Every demo number is simulated and labeled that way. Vouched's example student and all
   their verifiers are fictional, with `.example` domains so nothing points at a real school.
6. **Pushed a branch, no pull request**, so nothing on `main` changes until you say so.
7. **Vouched has no passwords yet.** A private key (saved by the student, kept in a cookie) is the login. Real sign-in
   needs an email service, which needs your account.
8. **Vouched stores data in a JSON file** for now. Fine on your laptop; on Vercel it resets. A database (Supabase) is the
   first thing to add before real students use it.

## Questions for you

(Each has the default I assumed, so "keep the default" is a fine answer.)

1. **Contact email** for "Pilot with us" (Rewater) and "Talk to us" (Vouched). Default: buttons hidden.
2. **Do you want a Supabase account set up** for Vouched's database and sign-in? Default: not yet; it's the next step.
3. **Vouched's pricing for colleges.** Default: the page says pricing is being set with early partners.
4. **Names.** Keep Rewater / Vouched / Doorbell? Default: keep for now.

## Skills I wrote (in `.claude/skills/`)

- `venture-conventions`: stack, layout, colors, data honesty, privacy rules for minors, security habits, pitfalls.
- `ship-check`: typecheck, test, build, serve, screenshot, and catch browser errors before calling anything done.
- `new-venture-app`: scaffold a new app folder with everything pre-set (used it for Vouched and Doorbell).
- `market-check`: check if an idea exists before building, and phrase claims honestly.
- `morning-handoff`: how I work while you're away and how this file is structured.
