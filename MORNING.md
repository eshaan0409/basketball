# Good morning

All three apps are built, tested, and pushed to the branch `claude/three-ventures`. Nothing is on `main`, deployed,
or sent anywhere.

## What's done

| App | What you can do with it today | Tests |
|---|---|---|
| **Rewater** (`rewater/`) | Load smart-meter data (or the simulated demo) and get a verified, conservative water-savings figure with charts and a downloadable report. | 27 unit tests + upload flow in a browser |
| **Vouched** (`vouched/`) | A student lists activities, sends verification links, the verifier confirms or corrects each claim, and the student shares a record that shows who checked what. | 30 unit tests + student → verifier → reader flow |
| **Doorbell** (`doorbell/`) | An AI assistant finds a shop, sees open times and requests a booking; the owner answers by text (or the on-screen phone). Includes a real MCP server and REST API. | 42 unit tests + demo, owner setup and booking flows |

How I checked: every app passes typecheck, unit tests and a production build. Each was run in a real browser on
desktop, phone width and dark mode with no console errors or layout overflow, and its main flow was driven end to
end. Rewater's engine was also tested on 12 simulated programs with known answers: it landed within 4.4% every time.

## See it

On a computer:

```bash
git clone https://github.com/eshaan0409/basketball && cd basketball
git checkout claude/three-ventures
cd doorbell && npm install && npm run dev    # then open http://localhost:3000/demo
```

Same for `rewater` (open `/verify`) and `vouched` (open `/demo`, then `/start`).

To get links you can open on your phone, deploy on Vercel (free): **Add New Project → import `eshaan0409/basketball`
→ pick branch `claude/three-ventures` → set Root Directory to `rewater`** (then repeat for `vouched` and `doorbell`).
Rewater works fully when deployed. Vouched and Doorbell work for demos, but their data resets on Vercel until we add a
database (question 2).

## Decisions I made for you

1. **Deleted the old T-rex game.** It's still in git history.
2. **Names**: Rewater, Vouched, Doorbell. Each name lives in one config file per app.
3. **One repo, one folder per app**, each deployable on its own. Easy to split into three repos later.
4. **Stack**: Next.js 16, React 19, TypeScript 5.9 (not 7, which breaks Next's build), Tailwind 4, Vitest.
5. **No real data anywhere.** Demo numbers are simulated; demo people and shops are fictional with `.example`
   domains or 555-01xx phone numbers, and the pages say so.
6. **No passwords yet** (Vouched, Doorbell). Each user gets a private key; real sign-in needs an email/SMS service
   on your account.
7. **Data is stored in a JSON file** in Vouched and Doorbell. Fine locally; a database is the first upgrade.
8. **Texting is simulated** in Doorbell until Twilio is connected. Every text appears on an on-screen phone instead.
9. **Rewater credits only the low end** of its 90% confidence range. That's what buyers will trust, even though it's
   a smaller number to sell.
10. **Vouched shows readers the email domain** a verifier answered from (never the address), and refuses free email
    providers as an "organization". This closed a loophole I found while testing.

## Questions for you

Each has the default I assumed, so "keep the default" is a fine answer.

1. **Which app first?** They can't all get your time. Default: **Rewater**. It's the most original, and you already
   have the utility contacts from Root-It.
2. **Set up Supabase** (database + sign-in) for Vouched and Doorbell? Default: not yet. It needs your account
   (free tier is fine).
3. **Twilio for real texts in Doorbell?** About $1/month per number plus per-text fees, and US carrier
   registration. Default: not until a real shop says yes.
4. **Contact email** for the "Pilot with us" / "Talk to us" buttons. Default: hidden.
5. **Pricing**: Doorbell's fee per confirmed booking, Vouched's price for colleges. Default: not shown anywhere.
6. **Keep the names?** Default: yes, for now.
7. **Can I open a pull request into `main`**, or do you want to look first? Default: you look first.

## Ready for you to do (needs your name or account)

- **Deploy** the three apps on Vercel (steps above).
- **Rewater pilot ask.** Email the Carmichael and Folsom contacts from your Root-It interviews, who said they have
  smart meters. Something like: *"You mentioned a 100-home pilot. I've built the tool that measures outdoor savings
  from AMI data with a control group. Could I run it on two years of anonymized monthly reads for a sample of homes?
  You'd get a savings report you can use for state reporting."*
- **Doorbell first shops.** Walk the Power Inn corridor from your Sites for Shops call sheet with the `/demo` page open
  on your phone. Your pitch: "Free listing. You get texts, you reply Y or N."
- **Vouched sanity check.** Ask your counselor and two admissions people you know whether they'd click a verified
  record link. That decides whether the college side is real before we build it.

## Important context I found

- **Google is testing "Ask for Me"**: its AI phones auto shops and nail salons for prices and availability. That's
  Doorbell's exact market. Doorbell still differs: it books (Ask for Me only gathers information), works with any
  assistant, and the owner opts in. Details in `doorbell/docs/market.md`.
- **College Board was fined** for selling student data without consent. Vouched is designed so students are never
  sold; colleges pay to message students who opt in.

## Skills I wrote (`.claude/skills/`)

- `venture-conventions`: the rules all three apps follow, plus everything that went wrong tonight and how to avoid it.
- `ship-check`: build, serve, screenshot, and run the browser flows (`scripts/serve.sh`, `shoot.sh`, `run-e2e.sh`).
- `new-venture-app`: one command to scaffold a fourth app with the same setup.
- `market-check`: how to check an idea against what exists, with sources.
- `morning-handoff`: how I work while you're away.

## What I'd do next

1. Rewater: run it on one real utility's data (pilot ask above), then line it up with the VWBA standard buyers use.
2. Database + sign-in for Vouched and Doorbell (Supabase).
3. Doorbell: sign 3 real shops, then connect Twilio.
4. Vouched: build the college side only after the sanity check says yes.
