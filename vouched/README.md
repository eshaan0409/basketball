# Vouched

Activities verified at the source. Students list what they do; the coach, manager, client or advisor who saw it
confirms or corrects each claim; readers see exactly who checked what.

The business: free for students. Colleges, scholarship and summer programs pay to reach students who opt in,
filtered by verified activity. Students are never sold as data. (See `docs/market.md` for why this is open.)

## What works today

- **Student record** (`/start`, `/record`): add activities with role, dates, hours, description and specific
  claims (impact, revenue, awards). Character counters for Common App (50/100/150) and UC (350) limits.
- **Padding checks**: overlapping activities over 40 hours a week, impossible dates, unverified big titles and
  numbers, statements edited after they were verified.
- **Verification requests**: a private link per verifier. The page shows, live, what level their answer can reach.
  Family members are refused. The verifier marks each statement accurate / needs a correction / can't say, signs
  with name and title, and attests. No account needed. Links expire after 30 days and can be withdrawn.
- **Assurance levels**, per statement:
  - *Confirmed by the organization*: answered from an email at the organization's own domain by a supervisor,
    coach, teacher or client.
  - *Confirmed by a named person*: a personal or outside address, or a peer.
  - *Self-reported*: not checked, or edited since it was checked.
  Corrections are shown as corrections; a student can adopt the verifier's wording and stay verified.
- **Sharing** (`/p/<token>`): one private link per place you share; turn any off. Readers see verifier names, titles
  and the domain they answered from, never email addresses. Shared pages are `noindex`.
- **Example** (`/demo`) with a fictional student, and a page **for colleges** (`/colleges`).

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # 30 tests: levels, padding checks, the full request/answer/share flow, the file store
npm run build
```

Data is stored in `.data/vouched.json` (gitignored). Set `VOUCHED_DATA_FILE` to put it elsewhere.

## Deploy

Vercel with Root Directory `vouched` works for a demo, but **the file store is not durable on serverless hosts**
(records vanish on restart; the app shows a warning). Before real students use it, add a database implementation of
the `Store` interface in `src/lib/store.ts` (Postgres via Supabase is the plan) and real sign-in (email magic links).

## Known gaps, in order

1. **Database + sign-in.** Today a private key in a cookie is the only credential.
2. **Email delivery.** Students send verifier links themselves; the app should send them (and reminders).
3. **Self-controlled domains.** A student who owns a domain could create a "work address" there. Readers see the
   domain, which helps, but Entrepreneurship activities should require a third party (a client at a different
   domain) for the top level.
4. **Revenue proof.** Connect Stripe/Square/Shopify read-only to verify revenue claims from records.
5. **The paid side.** Opt-in discovery and messaging for colleges and programs.
