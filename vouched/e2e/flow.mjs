import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3102";
const OUT = process.env.OUT ?? "/tmp";
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const errors = [];
const ctx = async (opts = {}) => {
  const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  await c.grantPermissions(["clipboard-read", "clipboard-write"]);
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
  return p;
};
const hydrate = (p) => p.waitForTimeout(1000);

// 1. Student starts a record.
const student = await ctx();
await student.goto(`${BASE}/start`, { waitUntil: "networkidle" }); await hydrate(student);
await student.getByLabel("Your name, as it appears on your applications").fill("Sam Rivera");
await student.getByLabel("High school").fill("Example High School");
await student.getByLabel("Class of").fill("2028");
await student.getByRole("button", { name: "Create my record" }).click();
await student.getByText("Save your private key").waitFor();
const key = (await student.locator("code").first().textContent()).trim();
console.log("1. record created, key length", key.length);
await student.getByRole("button", { name: "I saved it, continue" }).click();
await student.waitForURL("**/record"); await student.getByText("Add your first activity").waitFor();

// 2. Add an activity with a claim.
await student.getByRole("button", { name: "Add an activity" }).click();
await student.getByLabel("Category").selectOption("Entrepreneurship");
await student.getByLabel("Position or role").fill("Founder, sports photographer");
await student.getByLabel("Organization", { exact: false }).first().fill("Example Unified athletics");
await student.getByLabel("Organization website").fill("exampleusd.org");
await student.getByLabel("Started").fill("2024-08");
await student.getByLabel("Hours per week").fill("8");
await student.getByLabel("Weeks per year").fill("36");
await student.getByLabel("Description").fill("Game photos and highlight reels for two high schools.");
await student.getByRole("button", { name: "+ Add a claim" }).click();
await student.getByLabel("Claim", { exact: true }).fill("Photographed 41 varsity games");
await student.getByRole("button", { name: "Add activity" }).click();
await student.getByRole("heading", { name: "Founder, sports photographer" }).waitFor();
console.log("2. activity added; findings:", (await student.getByText("Before a reader sees this").count()) > 0);
await student.screenshot({ path: `${OUT}/record-before.png`, fullPage: true });

// 3. Family member is refused live, then a real verifier gets a link.
await student.getByRole("button", { name: "Ask someone to verify" }).click();
await student.getByLabel("Their full name").fill("Dana Ortiz");
await student.getByLabel("Their title").fill("Athletic Director");
await student.getByLabel("How they know your work").selectOption("family");
await student.getByLabel("Their email").fill("mom@gmail.com");
console.log("3a. family refused:", await student.getByText("Family members can't verify").isVisible(),
  "| submit disabled:", await student.getByRole("button", { name: "Create verification link" }).isDisabled());
await student.getByLabel("How they know your work").selectOption("supervisor");
await student.getByLabel("Their email").fill("dortiz@exampleusd.org");
console.log("3b. predicted level shown:", await student.getByText("Their answer will show as").isVisible());
await student.getByRole("button", { name: "Create verification link" }).click();
await student.getByText("Link ready for Dana Ortiz").waitFor();
const link = (await student.locator("section[aria-live] code").textContent()).trim();
console.log("3c. verifier link:", link.replace(/[^/]+$/, "<token>"));

// 4. Verifier answers in a separate browser (no cookie).
const verifier = await ctx({ viewport: { width: 390, height: 844 } });
await verifier.goto(link, { waitUntil: "networkidle" }); await hydrate(verifier);
await verifier.screenshot({ path: `${OUT}/verifier-phone.png`, fullPage: true });
const groups = verifier.locator("fieldset");
const n = await groups.count();
for (let i = 0; i < n; i++) {
  const label = i === n - 1 ? "Needs a correction" : "Accurate";
  await groups.nth(i).getByText(label, { exact: true }).click();
}
await verifier.getByLabel("What's accurate?").fill("Photographed 38 varsity games");
await verifier.getByRole("button", { name: "Submit answers" }).click();
console.log("4a. without attest:", (await verifier.getByRole("checkbox").evaluate((el) => el.validity.valid)) ? "valid?!" : "blocked by required checkbox");
await verifier.getByRole("checkbox").check();
await verifier.getByRole("button", { name: "Submit answers" }).click();
await verifier.getByText("Thank you").waitFor();
console.log("4b. verifier submitted");
await verifier.goto(link, { waitUntil: "networkidle" });
console.log("4c. reopening link:", await verifier.getByRole("heading", { level: 1 }).textContent());

// 5. Student sees the result, accepts the correction, shares.
await student.reload({ waitUntil: "networkidle" }); await hydrate(student);
console.log("5a. org-confirmed tiles:", await student.getByText("Org-confirmed").count());
await student.getByRole("button", { name: "Accept correction" }).click();
await student.waitForTimeout(800);
console.log("5b. correction offer gone:", (await student.getByRole("button", { name: "Accept correction" }).count()) === 0);
await student.getByLabel("Link label").fill("UC application");
await student.getByRole("button", { name: "Create link" }).click();
await student.getByText("UC application").waitFor();
const shareUrl = (await student.locator("li code").last().textContent()).trim();
await student.screenshot({ path: `${OUT}/record-after.png`, fullPage: true });

// 6. A reader opens the share link.
const reader = await ctx({ colorScheme: "dark" });
await reader.goto(shareUrl, { waitUntil: "networkidle" });
const html = await reader.content();
console.log("6a. reader sees name:", html.includes("Sam Rivera"), "| leaks verifier email:", html.includes("dortiz@"), "| leaks token:", html.includes(link.split("/").pop()));
console.log("6b. shows correction kept verified:", html.includes("Photographed 38 varsity games"));
await reader.screenshot({ path: `${OUT}/shared-dark.png`, fullPage: true });

// 7. Student turns the link off; reader gets 404.
await student.getByRole("button", { name: "Turn off" }).click();
await student.waitForTimeout(600);
const res = await reader.goto(shareUrl);
console.log("7. after revoke status:", res.status());

// 8. Key restores access in a new browser.
const other = await ctx();
await other.goto(`${BASE}/start`, { waitUntil: "networkidle" }); await hydrate(other);
await other.getByLabel("Private key").fill(key);
await other.getByRole("button", { name: "Open" }).click();
await other.waitForURL("**/record");
await other.getByRole("heading", { name: "Sam Rivera" }).waitFor();
console.log("8. key restore works");

console.log("errors:", errors.length ? errors : "none");
await browser.close();
