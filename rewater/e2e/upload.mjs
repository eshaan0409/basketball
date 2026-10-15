import { chromium } from "playwright";
import fs from "node:fs";
const OUT = process.env.OUT ?? "/tmp";
const BASE = process.env.BASE ?? "http://localhost:3101";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${BASE}/verify`, { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
// Download the three sample files.
const files = {};
const downloads = [];
page.on("download", (d) => downloads.push(d));
await page.getByText("Download sample files").click();
await page.waitForTimeout(1500);
for (const d of downloads) { const p = `${OUT}/${d.suggestedFilename()}`; await d.saveAs(p); files[d.suggestedFilename()] = p; }
console.log("downloaded:", Object.keys(files).join(", "));
// Verify with nothing uploaded -> friendly error.
await page.getByText("Verify uploaded files").click();
console.log("empty-state error shown:", await page.locator("div[role=alert].bg-warn-bg").isVisible());
// Upload in the order the inputs appear: reads, installs, weather.
const inputs = page.locator('input[type=file]');
await inputs.nth(0).setInputFiles(files["sample_meter_reads.csv"]);
await inputs.nth(1).setInputFiles(files["sample_installs.csv"]);
await inputs.nth(2).setInputFiles(files["sample_weather.csv"]);
await page.getByText("Verify uploaded files").click();
await page.getByText("Verification report").waitFor({ timeout: 5000 });
const dataset = await page.locator("section[aria-label='Verification results'] p").first().textContent();
const homes = await page.getByText("Homes verified").locator("..").textContent();
console.log("dataset line:", dataset);
console.log("homes tile:", homes);
// Bad file -> row errors listed.
fs.writeFileSync(`${OUT}/bad_reads.csv`, "account_id,date,gallons\nA,nope,5\n");
await inputs.nth(0).setInputFiles(`${OUT}/bad_reads.csv`);
await page.getByText("Verify uploaded files").click();
await page.waitForTimeout(300);
console.log("bad-file alert:", (await page.locator("div[role=alert].bg-warn-bg").textContent()).slice(0, 160));
console.log("page errors:", errors.length ? errors : "none");
await browser.close();
