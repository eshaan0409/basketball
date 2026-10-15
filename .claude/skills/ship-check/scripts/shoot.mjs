// Usage: shoot.sh <config.json> (or node shoot.mjs <config.json> where playwright is installed)
// Config: { base, out, shots: [{ name, path, width?, height?, scheme?, fullPage?, steps?: [{ click?: text|selector, hover?: selector, wait?: ms, fill?: [selector, value] }] }] }
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const config = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
fs.mkdirSync(config.out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
// Wait for hydration before any step clicks; clicks that land earlier do nothing.
const HYDRATE_MS = 1000;
let problems = 0;

for (const shot of config.shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width ?? 1280, height: shot.height ?? 900 },
    colorScheme: shot.scheme ?? "light",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(config.base + shot.path, { waitUntil: "networkidle" });
  if (shot.steps?.length) await page.waitForTimeout(HYDRATE_MS);
  for (const step of shot.steps ?? []) {
    if (step.click) {
      const loc = step.click.startsWith("css=") ? page.locator(step.click.slice(4)) : page.getByText(step.click, { exact: false });
      await loc.first().click();
    }
    if (step.fill) await page.locator(step.fill[0]).first().fill(step.fill[1]);
    if (step.hover) await page.locator(step.hover).first().hover({ position: step.position });
    if (step.wait) await page.waitForTimeout(step.wait);
  }
  const file = path.join(config.out, `${shot.name}.png`);
  await page.screenshot({ path: file, fullPage: shot.fullPage ?? true });
  // Horizontal overflow check: content wider than the viewport means a mobile layout bug.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) errors.push(`horizontal overflow: ${overflow}px`);
  console.log(`${errors.length ? "WARN" : "ok  "} ${shot.name} -> ${file}`);
  for (const e of errors) console.log(`     ${e}`);
  problems += errors.length;
  await context.close();
}
await browser.close();
process.exit(problems ? 1 : 0);
