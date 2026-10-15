import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3103";
const OUT = process.env.OUT ?? "/tmp";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const errors = [];
const ctx = async (opts = {}) => {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  return p;
};

// A. Demo: assistant books, owner replies Y on the on-screen phone.
const demo = await ctx();
await demo.goto(`${BASE}/demo`, { waitUntil: "networkidle" }); await demo.waitForTimeout(1000);
await demo.getByText("Can you book me an oil change").click();
await demo.getByText("The soonest times are below").waitFor({ timeout: 10000 });
const slotButtons = demo.locator("section[aria-label='AI assistant'] button[aria-pressed]");
console.log("A1. slots offered:", await slotButtons.count());
await slotButtons.nth(1).click();
await demo.getByRole("button", { name: /^Request / }).click();
await demo.getByText("I've asked").waitFor();
await demo.locator("section[aria-label=\"Owner's phone\"] li", { hasText: "New booking via Demo assistant" }).waitFor({ timeout: 8000 });
console.log("A2. owner got the text:", true);
await demo.screenshot({ path: `${OUT}/demo-pending.png`, fullPage: true });
await demo.getByRole("button", { name: "Reply Y" }).click();
await demo.getByText("Booking status: confirmed").waitFor({ timeout: 10000 });
const assistantSays = await demo.locator("section[aria-label='AI assistant'] li").last().textContent();
console.log("A3. assistant now says:", assistantSays);
await demo.locator("section[aria-label=\"Customer's phone\"]").waitFor({ timeout: 6000 });
console.log("A4. customer text:", (await demo.locator("section[aria-label=\"Customer's phone\"] p").last().textContent()).slice(0, 80));
const masked = await demo.locator("section[aria-label=\"Owner's phone\"]").textContent();
console.log("A5. phone number masked on public demo:", masked.includes("(•••) •••-0110") && !masked.includes("555-0110"));
await demo.screenshot({ path: `${OUT}/demo-confirmed.png`, fullPage: true });

// B. A new owner sets up a shop.
const owner = await ctx();
await owner.goto(`${BASE}/owner/start`, { waitUntil: "networkidle" }); await owner.waitForTimeout(1000);
await owner.getByLabel("Shop name").fill("Test Tire & Lube");
await owner.getByLabel("Type of shop").selectOption("Tire shop");
await owner.getByLabel("City").fill("Sacramento");
await owner.getByLabel("Shop phone (customers see this)").fill("(916) 555-0160");
await owner.getByLabel("Cell for booking texts (private)").fill("(916) 555-0161");
await owner.getByLabel("Service name").fill("Flat repair");
await owner.getByLabel("Price").fill("$25");
await owner.getByRole("button", { name: "Create my shop" }).click();
await owner.getByText("Your shop is live").waitFor();
const slug = (await owner.getByRole("link", { name: "See my public page" }).getAttribute("href")).split("/").pop();
console.log("B1. shop created:", slug);
await owner.getByRole("link", { name: "Open my dashboard" }).click();
await owner.getByText("Requests waiting on you").waitFor();

// C. Someone requests through the public page; the owner confirms from the dashboard.
const customer = await ctx({ viewport: { width: 390, height: 844 } });
await customer.goto(`${BASE}/s/${slug}`, { waitUntil: "networkidle" }); await customer.waitForTimeout(1200);
const radio = customer.locator("input[name=slot]").first();
const hasSlots = await radio.count();
console.log("C1. public page slots:", hasSlots > 0);
if (hasSlots) {
  await customer.locator("label:has(input[name=slot])").first().click();
  await customer.getByLabel("Your name").fill("Pat Customer");
  await customer.getByLabel("Phone").fill("916-555-0170");
  await customer.getByRole("button", { name: "Request this time" }).click();
  await customer.getByText("pending", { exact: false }).first().waitFor();
  await customer.screenshot({ path: `${OUT}/shop-page-phone.png`, fullPage: true });
  await owner.locator("article", { hasText: "Pat Customer" }).waitFor({ timeout: 8000 });
  console.log("C2. owner sees request on dashboard");
  await owner.getByRole("button", { name: "Confirm" }).click();
  await owner.waitForTimeout(800);
  console.log("C3. moved to coming up:", await owner.locator("li", { hasText: "Pat Customer" }).locator("text=confirmed").count() > 0);
  await customer.getByText("Confirmed", { exact: false }).first().waitFor({ timeout: 10000 });
  console.log("C4. customer page updated to confirmed");
}
await owner.screenshot({ path: `${OUT}/owner-dashboard.png`, fullPage: true });
console.log("errors:", errors.length ? errors : "none");
await browser.close();
