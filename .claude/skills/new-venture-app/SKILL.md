---
name: new-venture-app
description: Scaffold a new venture app folder in this repo with the same pinned stack, design tokens, dark mode, chart components and test setup as rewater/. Use when starting a new product or prototype in this repo, instead of create-next-app.
---

# New venture app

```bash
.claude/skills/new-venture-app/scaffold.sh <folder> "<Display Name>" "<one-line tagline>" \
  <brand-hex> <brand-soft-hex> <brand-dark-mode-hex> <brand-soft-dark-mode-hex>
```

Example (Rewater's colors):

```bash
.claude/skills/new-venture-app/scaffold.sh rewater "Rewater" "Verified water savings." "#1d5fa8" "#e6eef8" "#5b9be6" "#172536"
```

What you get: Next.js 16 + React 19 + TypeScript 5.9 (not 7) + Tailwind 4 + Vitest 5, the token set from
`venture-conventions` with your brand color dropped in (light and dark), a generic layout driven by
`src/config/site.ts` (`nav`, `cta`, `footerNote`), an icon, the shared chart components in
`src/components/charts/`, and a passing smoke test. It installs dependencies and runs the test and typecheck.

## Picking brand colors

- `brand` is used for primary buttons with white text: it needs 4.5:1 contrast against `#ffffff`.
- `brand-dark-mode` is used for buttons with near-black text on the dark surface: it needs 4.5:1 against `#0b0b0b`.
- `brand-soft` is a pale tint for chips and highlights; `brand-soft-dark-mode` is a deep tint of the same hue.
- Pick a hue no sibling app uses, so the apps are distinguishable at a glance.

Check contrast with a quick script rather than by eye.

## After scaffolding

1. Fill `src/config/site.ts` (nav, cta).
2. Put the product's core logic in `src/lib/` with tests first (see `venture-conventions`).
3. Build the pages, then run `ship-check` and look at the screenshots.
4. Write the app's `README.md`: what works, run, deploy (Vercel Root Directory = folder), what's next.
