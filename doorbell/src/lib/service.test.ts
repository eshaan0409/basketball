import { describe, expect, it } from "vitest";
import { MemoryDb } from "./db";
import { DEMO_SHOPS, ensureDemoShops } from "./demo";
import { handleRpc } from "./mcp";
import {
  cancelBooking,
  createShop,
  decideFromDashboard,
  getBooking,
  handleOwnerText,
  ownerDashboard,
  requestBooking,
  searchShops,
  ServiceError,
} from "./service";
import { twilioSignature, verifyTwilioSignature, type SmsProvider } from "./sms";
import { runTool } from "./tools";

function fakeSms() {
  const sent: { to: string; body: string }[] = [];
  const provider: SmsProvider = {
    name: "outbox",
    async send(to, body) {
      sent.push({ to, body });
      return "queued";
    },
  };
  return { provider, sent };
}

// Monday Oct 19 2026, 8:00 AM Pacific.
const NOW = new Date("2026-10-19T15:00:00Z");
const later = (minutes: number) => new Date(NOW.getTime() + minutes * 60000);

async function setup() {
  const db = new MemoryDb();
  await ensureDemoShops(db);
  const sms = fakeSms();
  return { db, ...sms };
}

const request = (overrides: Record<string, unknown> = {}) => ({
  serviceId: "oil-change",
  start: "2026-10-20T10:00",
  customerName: "Maria Lopez",
  customerPhone: "916-555-0110",
  notifyCustomer: true,
  notes: "2014 Civic",
  via: "Claude",
  ...overrides,
});

describe("shops", () => {
  it("seeds demo shops once and finds them by need, category and city", async () => {
    const { db } = await setup();
    await ensureDemoShops(db);
    expect(await db.read((d) => d.shops.length)).toBe(DEMO_SHOPS.length);
    expect((await searchShops(db, { query: "oil change" })).map((s) => s.slug)).toEqual(["riverbend-auto-demo"]);
    expect((await searchShops(db, { category: "barber" })).map((s) => s.slug)).toEqual(["fifth-street-barbers-demo"]);
    expect((await searchShops(db, { city: "95814" })).length).toBe(1);
    expect((await searchShops(db, { query: "sushi" })).length).toBe(0);
  });

  it("validates owner input", async () => {
    const db = new MemoryDb();
    const base = DEMO_SHOPS[0].input;
    await expect(createShop(db, { ...base, ownerSms: "12" })).rejects.toThrow("booking texts");
    await expect(createShop(db, { ...base, services: [] })).rejects.toThrow("at least one service");
    await expect(createShop(db, { ...base, timezone: "Mars/Olympus" })).rejects.toThrow("timezone");
    const badHours = [...base.hours];
    badHours[1] = [{ open: "17:00", close: "08:00" }];
    await expect(createShop(db, { ...base, hours: badHours })).rejects.toThrow("closing after opening");
    const { shop } = await createShop(db, base);
    const { shop: twin } = await createShop(db, base);
    expect(twin.slug).not.toBe(shop.slug);
  });
});

describe("booking by text", () => {
  it("texts the owner, confirms on 'Y<code>', and texts the customer", async () => {
    const { db, provider, sent } = await setup();
    const { booking } = await requestBooking(db, provider, "riverbend-auto-demo", request(), NOW);
    expect(booking.status).toBe("pending");
    expect(sent[0].to).toBe("+19165550143");
    expect(sent[0].body).toContain(`Reply Y${booking.code}`);
    expect(sent[0].body).toContain("Tue Oct 20, 10 AM");

    const ack = await handleOwnerText(db, provider, "+1 (916) 555-0143", `y${booking.code}`, later(5));
    expect(ack).toContain("Confirmed");
    const after = await getBooking(db, provider, booking.id, later(6));
    expect(after.booking.status).toBe("confirmed");
    expect(sent.at(-1)).toMatchObject({ to: "+19165550110" });
    expect(sent.at(-1)!.body).toContain("you're booked");
  });

  it("accepts a bare 'yes' when only one request is open, and needs a code when several are", async () => {
    const { db, provider } = await setup();
    const first = await requestBooking(db, provider, "riverbend-auto-demo", request(), NOW);
    expect(await handleOwnerText(db, provider, "+19165550143", "yes", later(1))).toContain(`#${first.booking.code}`);
    await requestBooking(db, provider, "riverbend-auto-demo", request({ start: "2026-10-20T11:00", customerPhone: "9165550111" }), NOW);
    await requestBooking(db, provider, "riverbend-auto-demo", request({ start: "2026-10-20T12:00", customerPhone: "9165550112" }), NOW);
    const reply = await handleOwnerText(db, provider, "+19165550143", "ok", later(2));
    expect(reply).toContain("2 open requests");
  });

  it("passes the owner's note on a decline", async () => {
    const { db, provider, sent } = await setup();
    const { booking } = await requestBooking(db, provider, "riverbend-auto-demo", request(), NOW);
    await handleOwnerText(db, provider, "+19165550143", `N${booking.code} try 2pm`, later(3));
    const { booking: b } = await getBooking(db, provider, booking.id, later(4));
    expect(b).toMatchObject({ status: "declined", ownerNote: "try 2pm" });
    expect(sent.at(-1)!.body).toContain('They said: "try 2pm"');
  });

  it("expires unanswered requests, frees the slot, and tells the customer", async () => {
    const { db, provider, sent } = await setup();
    const { booking } = await requestBooking(db, provider, "riverbend-auto-demo", request(), NOW);
    const { booking: b } = await getBooking(db, provider, booking.id, later(31));
    expect(b.status).toBe("expired");
    expect(sent.at(-1)!.body).toContain("didn't answer in time");
    const late = await handleOwnerText(db, provider, "+19165550143", `Y${booking.code}`, later(32));
    expect(late).toContain("expired");
  });

  it("does not text a customer who didn't agree to texts", async () => {
    const { db, provider, sent } = await setup();
    const { booking } = await requestBooking(db, provider, "riverbend-auto-demo", request({ notifyCustomer: false }), NOW);
    await handleOwnerText(db, provider, "+19165550143", `Y${booking.code}`, later(1));
    expect(sent.filter((s) => s.to === "+19165550110")).toHaveLength(0);
  });

  it("rejects taken, invalid and abusive requests", async () => {
    const { db, provider } = await setup();
    await requestBooking(db, provider, "riverbend-auto-demo", request(), NOW);
    await requestBooking(db, provider, "riverbend-auto-demo", request({ customerPhone: "9165550120" }), NOW);
    // Capacity 2: a third at 10:00 is refused.
    await expect(requestBooking(db, provider, "riverbend-auto-demo", request({ customerPhone: "9165550121" }), NOW)).rejects.toMatchObject({ status: 409 });
    await expect(requestBooking(db, provider, "riverbend-auto-demo", request({ start: "2026-10-20 10:00" }), NOW)).rejects.toThrow("YYYY-MM-DDTHH:mm");
    await expect(requestBooking(db, provider, "riverbend-auto-demo", request({ customerPhone: "123" }), NOW)).rejects.toThrow("phone");
    await expect(requestBooking(db, provider, "nope", request(), NOW)).rejects.toMatchObject({ status: 404 });
    // Same customer, third open request.
    await requestBooking(db, provider, "riverbend-auto-demo", request({ start: "2026-10-20T13:00" }), NOW);
    await expect(requestBooking(db, provider, "riverbend-auto-demo", request({ start: "2026-10-20T14:00" }), NOW)).rejects.toMatchObject({ status: 429 });
  });

  it("ignores texts from unknown numbers", async () => {
    const { db, provider } = await setup();
    expect(await handleOwnerText(db, provider, "+19165550999", "Y1", NOW)).toBeNull();
  });

  it("lets the owner decide from the dashboard and lets the customer cancel", async () => {
    const db = new MemoryDb();
    const { provider, sent } = fakeSms();
    const { secret } = await createShop(db, { ...DEMO_SHOPS[0].input, name: "Owner Test" }, NOW);
    const slug = (await db.read((d) => d.shops[0].slug)) as string;
    const { booking } = await requestBooking(db, provider, slug, request(), NOW);
    await decideFromDashboard(db, provider, secret, booking.id, "confirm", "", later(1));
    const dash = await ownerDashboard(db, provider, secret, later(2));
    expect(dash.stats).toMatchObject({ pending: 0, confirmedThisMonth: 1 });
    await cancelBooking(db, provider, booking.id, later(3));
    expect(sent.at(-1)!.body).toContain("Cancelled by the customer");
    await expect(cancelBooking(db, provider, booking.id, later(4))).rejects.toBeInstanceOf(ServiceError);
    await expect(ownerDashboard(db, provider, "wrong", NOW)).rejects.toMatchObject({ status: 401 });
  });
});

describe("tools and MCP", () => {
  it("runs the full agent flow through tools", async () => {
    const { db, provider } = await setup();
    const ctx = { db, sms: provider, now: NOW, agentName: "Test agent" };
    const found = await runTool("search_shops", { query: "fade" }, ctx);
    expect(found.count).toBe(1);
    const shop = await runTool("get_shop", { shop: "fifth-street-barbers-demo" }, ctx);
    expect((shop.hours as string[])[1]).toBe("Monday: closed");
    const open = await runTool("check_availability", { shop: "fifth-street-barbers-demo", service_id: "fade" }, ctx);
    const slots = open.slots as { start: string }[];
    expect(slots[0].start).toBe("2026-10-20T09:00");
    const booked = await runTool(
      "request_booking",
      { shop: "fifth-street-barbers-demo", service_id: "fade", start: slots[0].start, customer_name: "Jay", customer_phone: "9165550130" },
      ctx,
    );
    expect(booked).toMatchObject({ status: "pending", start_display: "Tue Oct 20, 9 AM" });
    expect(String(booked.message)).toContain("Nothing is booked yet");
    const status = await runTool("get_booking_status", { booking_id: booked.booking_id }, ctx);
    expect(status.status).toBe("pending");
    expect(JSON.stringify(status)).not.toContain("9165550130");
  });

  it("speaks JSON-RPC: initialize, list, call, errors, notifications", async () => {
    const { db, provider } = await setup();
    const ctx = { db, sms: provider, now: NOW };
    const init = await handleRpc({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } } }, ctx);
    expect(init).toMatchObject({ id: 1, result: { protocolVersion: "2025-03-26", capabilities: { tools: {} }, serverInfo: { name: "doorbell" } } });
    const future = await handleRpc({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "2099-01-01" } }, ctx);
    expect(future).toMatchObject({ result: { protocolVersion: "2025-06-18" } });
    expect(await handleRpc({ jsonrpc: "2.0", method: "notifications/initialized" }, ctx)).toBeNull();

    const list = (await handleRpc({ jsonrpc: "2.0", id: 3, method: "tools/list" }, ctx)) as { result: { tools: { name: string; inputSchema: unknown }[] } };
    expect(list.result.tools.map((t) => t.name)).toEqual([
      "search_shops",
      "get_shop",
      "check_availability",
      "request_booking",
      "get_booking_status",
      "cancel_booking",
    ]);

    const call = await handleRpc({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "search_shops", arguments: { query: "brake" } } }, ctx);
    expect(call).toMatchObject({ result: { isError: false, structuredContent: { count: 1 } } });

    const toolError = await handleRpc({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "get_shop", arguments: { shop: "missing" } } }, ctx);
    expect(toolError).toMatchObject({ result: { isError: true } });

    expect(await handleRpc({ jsonrpc: "2.0", id: 6, method: "resources/list" }, ctx)).toMatchObject({ error: { code: -32601 } });
    expect(await handleRpc({ jsonrpc: "2.0", id: 7, method: "tools/call", params: { name: "nope" } }, ctx)).toMatchObject({ error: { code: -32602 } });
    expect(await handleRpc({ hello: "world" }, ctx)).toMatchObject({ error: { code: -32600 } });
    expect(await handleRpc([], ctx)).toMatchObject({ error: { code: -32600 } });
  });
});

describe("Twilio signatures", () => {
  it("matches Twilio's documented example", () => {
    // Example from https://www.twilio.com/docs/usage/security
    const params = { CallSid: "CA1234567890ABCDE", Caller: "+12349013030", Digits: "1234", From: "+12349013030", To: "+18005551212" };
    const url = "https://mycompany.com/myapp.php?foo=1&bar=2";
    expect(twilioSignature("12345", url, params)).toBe("0/KCTR6DLpKmkAf8muzZqo1nDgQ=");
    expect(verifyTwilioSignature("12345", url, params, "0/KCTR6DLpKmkAf8muzZqo1nDgQ=")).toBe(true);
    expect(verifyTwilioSignature("12345", url, params, "bad")).toBe(false);
  });
});

describe("FileDb", () => {
  it("persists changes, skips no-op writes, and sees other instances' writes", async () => {
    const { FileDb } = await import("./db");
    const { mkdtempSync, statSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const path = await import("node:path");
    const file = path.join(mkdtempSync(path.join(tmpdir(), "doorbell-")), "data.json");
    const a = new FileDb(file);
    const b = new FileDb(file);
    await ensureDemoShops(a);
    expect(await b.read((d) => d.shops.length)).toBe(DEMO_SHOPS.length);
    const before = statSync(file).mtimeMs;
    await new Promise((r) => setTimeout(r, 15));
    await a.update(() => undefined);
    expect(statSync(file).mtimeMs).toBe(before);
    const { provider } = fakeSms();
    await requestBooking(b, provider, "riverbend-auto-demo", request(), NOW);
    expect(await a.read((d) => d.bookings.length)).toBe(1);
  });
});
