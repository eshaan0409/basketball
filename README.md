# Ventures

Three prototypes, one folder each. Each is a separate Next.js app that deploys on its own.

| Folder | What it is | Who pays |
|---|---|---|
| [`rewater/`](rewater/README.md) | Verifies outdoor water savings from utility smart-meter data, so the gallons can be sold as replenishment to companies with water-positive pledges. | Companies with 2030 water pledges |
| [`vouched/`](vouched/README.md) | A student activity record where each claim is confirmed by the coach, manager or client who saw it. | Colleges and programs reaching opted-in students |
| [`doorbell/`](doorbell/README.md) | Lets AI assistants book shops that have no booking software; the owner confirms by text. | Shops, per confirmed booking |

Each folder has a `README.md` (what works, run, deploy, next), `docs/market.md` (what exists, with sources), and
`e2e/` browser flows.

## Run any of them

```bash
cd rewater   # or vouched, doorbell
npm install
npm run dev  # http://localhost:3000
npm test
```

## Working on this repo with Claude

Shared skills live in `.claude/skills/`:

- `venture-conventions`: stack, layout, design tokens, data honesty, privacy, security habits, known pitfalls
- `ship-check`: typecheck, test, build, serve, screenshot, and run e2e flows before calling anything done
- `new-venture-app`: scaffold another app with the same setup
- `market-check`: check whether an idea exists before building it
- `morning-handoff`: how to work unattended and hand back
