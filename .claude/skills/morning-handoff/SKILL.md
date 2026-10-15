---
name: morning-handoff
description: How to work unattended on this repo when the user is asleep or away and will not answer questions or approve prompts, and how to hand the work back. Use whenever the user says they will check back later, will not be accepting anything, or asks you to keep going without them; also when writing or updating MORNING.md.
---

# Working unattended, handing back in the morning

The user said: do whatever is needed, do not wait on questions, ask them in the morning. So:

## While working

- **Never block on a question.** Pick the reversible, conventional option, note it as a decision, and keep going.
- **Never do anything irreversible or outward-facing on their behalf**: no emails, no posts, no purchases, no
  domain registrations, no deploys to public URLs, no PRs or merges, no writes to shared docs or other repos.
  Prepare them instead (draft text, config, a ready command) and list them as "ready for you".
- **Commit small and push the working branch** (never `main`) after each meaningful step, so nothing is lost if the
  container is reclaimed. The branch for this work is `claude/three-ventures`.
- **Keep a running log** of decisions and questions as you go, in `MORNING.md`, so the handoff is accurate and
  not reconstructed from memory at the end.

## MORNING.md structure

Keep it short enough to read on a phone in five minutes:

1. **What's done**: one line per app with its status and the command to see it.
2. **Try it**: exact commands, or the deploy steps if they would rather click a link.
3. **Decisions I made for you**: each with the reason and how to reverse it.
4. **Questions for you**: numbered, each answerable in a sentence, most important first. Put the default you
   assumed next to each, so "keep the default" is a valid answer.
5. **Ready for you to do**: things that need their account or their name (deploys, emails, domains), with drafts.
6. **What I'd do next**: a short ordered list.

Do not pad it. Do not repeat the README. Link to files instead of pasting them.
