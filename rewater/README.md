# Rewater

Verified outdoor water savings from homes, sold to companies with water-positive pledges.

Rewater pays for smart irrigation controllers and turf replacement in homes that overwater, measures what they
save using the utility's smart-meter data, and sells the verified gallons as replenishment to companies like the
ones that have promised to put back more water than their data centers use.

This folder is the first working piece: the **verification engine** and a web app around it.

## What works today

- **Engine** (`src/lib/engine/`): meter reads + install dates + monthly weather in, verified savings out.
  Indoor baseline, a weather model per home, control-group adjustment, a bootstrap confidence interval,
  and a conservative creditable volume (the interval's lower bound). Tested on simulated programs with
  known savings: it lands within a few percent and the interval contains the truth.
- **Web app** (`src/app/`):
  - `/`: the pitch, for homeowners, utilities and buyers.
  - `/verify`: run the engine on simulated data, or load your own CSVs. Runs in the browser; files are never uploaded.
    Downloads: summary JSON, every home as CSV, excluded homes, and sample input files.
  - `/methodology`: every step, the defaults, and the known limits.

Everything shown on the demo is **simulated**. There is no real utility data in this repo.

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # engine tests
npm run typecheck
npm run build
```

## Deploy

Vercel: import the GitHub repo, set **Root Directory** to `rewater`, keep the defaults. No environment variables
are needed. The site is fully static.

## Input files

| File | Columns | Notes |
|------|---------|-------|
| Meter reads | `account_id, date, gallons` | Daily or monthly. A `ccf`/`hcf` column is converted to gallons. Common header aliases are accepted. |
| Installs | `account_id, install_date, intervention` | Accounts not listed are candidate control homes. |
| Weather | `month, et0_in, rain_in` | Monthly inches. In California, CIMIS station data has these. |

## Where to take it next

1. **A real pilot.** The Root-It interviews found Folsom and Carmichael have the smart-meter (AMI) data a
   pilot needs; Carmichael suggested 100 homes. Ask for 2–3 years of anonymized monthly reads for the
   pilot homes plus a few hundred non-participants.
2. **Matched controls.** Pick control homes that look like the upgraded ones (summer use, lot size, area)
   instead of using every non-participant.
3. **Weather per home.** Nearest CIMIS station instead of one file.
4. **Buyer-grade reporting.** Map the output to Volumetric Water Benefit Accounting (VWBA) and get the
   method reviewed by an independent verifier.
5. **Claims agreement.** Decide in writing who claims the gallons: the utility (state targets) or the buyer
   (replenishment).
