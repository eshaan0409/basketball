import { createHash, randomBytes } from "node:crypto";
import { availableSlots, holdsSlot, nextOpenings } from "./availability";
import type { Data, Db } from "./db";
import * as text from "./messages";
import { normalizePhone, parseReply } from "./replies";
import type { SmsProvider } from "./sms";
import { isLocalDateTime, isTime, isValidTimezone, toMinutes } from "./time";
import { CATEGORIES, type Booking, type Category, type Message, type Service, type Shop, type WeeklyHours } from "./types";

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const LIMITS = {
  pendingPerCustomerPerShop: 2,
  pendingPerShop: 25,
  services: 20,
};

export function newToken(bytes = 18): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

function int(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : fallback;
}

// ---------- messages ----------

interface Outgoing {
  messageId: string;
  phone: string;
  body: string;
}

function queue(data: Data, provider: SmsProvider, shop: Shop, booking: Booking | null, to: Message["to"], phone: string, body: string, now: Date): Outgoing {
  const message: Message = {
    id: newToken(9),
    shopId: shop.id,
    bookingId: booking?.id ?? null,
    to,
    direction: "out",
    phone,
    body,
    at: now.toISOString(),
    provider: provider.name,
    delivery: "queued",
  };
  data.messages.push(message);
  return { messageId: message.id, phone, body };
}

async function deliver(db: Db, provider: SmsProvider, outgoing: Outgoing[]) {
  for (const o of outgoing) {
    const delivery = await provider.send(o.phone, o.body);
    if (delivery !== "queued") {
      await db.update((d) => {
        const m = d.messages.find((x) => x.id === o.messageId);
        if (m) m.delivery = delivery;
      });
    }
  }
}

/** Expire pending requests the owner didn't answer in time, and tell those customers. */
function sweep(data: Data, provider: SmsProvider, now: Date, shopId?: string): Outgoing[] {
  const out: Outgoing[] = [];
  for (const b of data.bookings) {
    if (b.status !== "pending" || (shopId && b.shopId !== shopId) || new Date(b.respondBy) > now) continue;
    b.status = "expired";
    b.decidedAt = now.toISOString();
    const shop = data.shops.find((s) => s.id === b.shopId);
    if (shop && b.notifyCustomer) out.push(queue(data, provider, shop, b, "customer", b.customerPhone, text.customerExpired(shop, b), now));
  }
  return out;
}

// ---------- shops ----------

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "shop"
  );
}

function readHours(value: unknown): WeeklyHours {
  if (!Array.isArray(value) || value.length !== 7) throw new ServiceError("Hours need an entry for each day of the week.");
  return value.map((day, i) => {
    if (!Array.isArray(day)) throw new ServiceError("Each day's hours must be a list.");
    const intervals = day.slice(0, 4).map((iv) => {
      const open = str(iv?.open, 5);
      const close = str(iv?.close, 5);
      if (!isTime(open) || !isTime(close) || toMinutes(close) <= toMinutes(open)) {
        throw new ServiceError(`Hours on day ${i} must be HH:mm with closing after opening.`);
      }
      return { open, close };
    });
    intervals.sort((a, b) => a.open.localeCompare(b.open));
    for (let k = 1; k < intervals.length; k++) {
      if (toMinutes(intervals[k].open) < toMinutes(intervals[k - 1].close)) throw new ServiceError(`Hours on day ${i} overlap.`);
    }
    return intervals;
  });
}

function readServices(value: unknown, existing: Service[] = []): Service[] {
  if (!Array.isArray(value) || value.length === 0) throw new ServiceError("Add at least one service.");
  if (value.length > LIMITS.services) throw new ServiceError(`Up to ${LIMITS.services} services.`);
  const seen = new Set<string>();
  return value.map((s) => {
    const name = str(s?.name, 80);
    if (!name) throw new ServiceError("Every service needs a name.");
    const keep = typeof s?.id === "string" && existing.some((e) => e.id === s.id) ? s.id : null;
    let id = keep ?? (slugify(name).slice(0, 30) || newToken(4));
    while (seen.has(id)) id = `${id}-${newToken(2)}`;
    seen.add(id);
    return {
      id,
      name,
      durationMinutes: int(s?.durationMinutes, 5, 480, 30),
      priceText: str(s?.priceText, 40),
      description: str(s?.description, 200),
    };
  });
}

function readShop(input: Record<string, unknown>, base?: Shop) {
  const name = "name" in input ? str(input.name, 80) : (base?.name ?? "");
  if (!name) throw new ServiceError("Add the shop's name.");
  const category = (CATEGORIES as readonly string[]).includes(input.category as string)
    ? (input.category as Category)
    : (base?.category ?? "Other service");
  const phone = "phone" in input ? normalizePhone(str(input.phone, 30)) : (base?.phone ?? null);
  if (!phone) throw new ServiceError("The shop phone number doesn't look right.");
  const ownerSms = "ownerSms" in input ? normalizePhone(str(input.ownerSms, 30)) : (base?.ownerSms ?? null);
  if (!ownerSms) throw new ServiceError("The number for booking texts doesn't look right.");
  const timezone = "timezone" in input ? str(input.timezone, 60) : (base?.timezone ?? "America/Los_Angeles");
  if (!isValidTimezone(timezone)) throw new ServiceError("Unknown timezone.");
  const addr = (input.address ?? {}) as Record<string, unknown>;
  return {
    name,
    category,
    description: "description" in input ? str(input.description, 300) : (base?.description ?? ""),
    address:
      "address" in input
        ? { street: str(addr.street, 120), city: str(addr.city, 60), state: str(addr.state, 20), zip: str(addr.zip, 12) }
        : (base?.address ?? { street: "", city: "", state: "", zip: "" }),
    phone,
    ownerSms,
    timezone,
    hours: "hours" in input ? readHours(input.hours) : (base?.hours ?? [[], [], [], [], [], [], []]),
    closedDates:
      "closedDates" in input && Array.isArray(input.closedDates)
        ? input.closedDates.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(0, 60)
        : (base?.closedDates ?? []),
    services: "services" in input ? readServices(input.services, base?.services) : (base?.services ?? []),
    capacity: "capacity" in input ? int(input.capacity, 1, 20, 1) : (base?.capacity ?? 1),
    slotMinutes: "slotMinutes" in input ? ([10, 15, 20, 30, 60].includes(Number(input.slotMinutes)) ? Number(input.slotMinutes) : 30) : (base?.slotMinutes ?? 30),
    leadMinutes: "leadMinutes" in input ? int(input.leadMinutes, 0, 2880, 60) : (base?.leadMinutes ?? 60),
    horizonDays: "horizonDays" in input ? int(input.horizonDays, 1, 90, 14) : (base?.horizonDays ?? 14),
    replyWindowMinutes: "replyWindowMinutes" in input ? int(input.replyWindowMinutes, 5, 240, 30) : (base?.replyWindowMinutes ?? 30),
    published: "published" in input ? input.published === true : (base?.published ?? true),
  };
}

export async function createShop(db: Db, input: Record<string, unknown>, now = new Date(), opts: { demo?: boolean; slug?: string; secret?: string } = {}) {
  const fields = readShop(input);
  if (fields.services.length === 0) throw new ServiceError("Add at least one service.");
  const secret = opts.secret ?? newToken(32);
  const shop = await db.update((data) => {
    let slug = opts.slug ?? slugify(fields.name);
    while (data.shops.some((s) => s.slug === slug)) slug = `${slugify(fields.name)}-${newToken(3).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const created: Shop = {
      id: newToken(9),
      slug,
      ownerHash: hashSecret(secret),
      ...fields,
      demo: opts.demo ?? false,
      nextCode: 1,
      createdAt: now.toISOString(),
    };
    data.shops.push(created);
    return created;
  });
  return { shop, secret };
}

export async function getOwnerShop(db: Db, secret: string | undefined | null): Promise<Shop> {
  if (!secret) throw new ServiceError("Not signed in.", 401);
  const hash = hashSecret(secret);
  const shop = await db.read((d) => d.shops.find((s) => s.ownerHash === hash));
  if (!shop) throw new ServiceError("Not signed in.", 401);
  return shop;
}

export async function updateShop(db: Db, secret: string, input: Record<string, unknown>) {
  const owner = await getOwnerShop(db, secret);
  return db.update((data) => {
    const shop = data.shops.find((s) => s.id === owner.id)!;
    Object.assign(shop, readShop(input, shop));
    return shop;
  });
}

export interface ShopSummary {
  slug: string;
  name: string;
  category: Category;
  city: string;
  address: string;
  phone: string;
  services: { id: string; name: string; durationMinutes: number; priceText: string }[];
  demo: boolean;
}

export function summarizeShop(s: Shop): ShopSummary {
  return {
    slug: s.slug,
    name: s.name,
    category: s.category,
    city: s.address.city,
    address: [s.address.street, s.address.city, s.address.state, s.address.zip].filter(Boolean).join(", "),
    phone: s.phone,
    services: s.services.map(({ id, name, durationMinutes, priceText }) => ({ id, name, durationMinutes, priceText })),
    demo: s.demo,
  };
}

export async function searchShops(db: Db, q: { query?: unknown; category?: unknown; city?: unknown }) {
  const words = str(q.query, 100).toLowerCase().split(/\s+/).filter(Boolean);
  const category = str(q.category, 60).toLowerCase();
  const city = str(q.city, 60).toLowerCase();
  return db.read((d) =>
    d.shops
      .filter((s) => s.published)
      .filter((s) => !category || s.category.toLowerCase().includes(category))
      .filter((s) => !city || s.address.city.toLowerCase() === city || s.address.zip === city)
      .map((s) => {
        const hay = [s.name, s.category, s.description, s.address.city, ...s.services.map((x) => x.name)].join(" ").toLowerCase();
        return { s, score: words.filter((w) => hay.includes(w)).length };
      })
      .filter(({ score }) => words.length === 0 || score > 0)
      .sort((a, b) => b.score - a.score || Number(a.s.demo) - Number(b.s.demo) || a.s.name.localeCompare(b.s.name))
      .slice(0, 20)
      .map(({ s }) => summarizeShop(s)),
  );
}

export async function getShop(db: Db, slug: string): Promise<Shop> {
  const shop = await db.read((d) => d.shops.find((s) => s.slug === slug && s.published));
  if (!shop) throw new ServiceError(`No shop "${slug}". Use search_shops to find one.`, 404);
  return shop;
}

// ---------- availability and bookings ----------

export async function checkAvailability(db: Db, slug: string, serviceId: string, date: string | undefined, now = new Date()) {
  const shop = await getShop(db, slug);
  const bookings = await db.read((d) => d.bookings.filter((b) => b.shopId === shop.id));
  if (!date) {
    const service = shop.services.find((s) => s.id === serviceId);
    if (!service) throw new ServiceError(`Unknown service "${serviceId}". Use get_shop to list services.`);
    return { shop, service, date: null, slots: nextOpenings(shop, bookings, serviceId, shop.horizonDays, now, 8) };
  }
  const res = availableSlots(shop, bookings, serviceId, date, now);
  if (!res.ok) throw new ServiceError(res.reason);
  return { shop, service: shop.services.find((s) => s.id === serviceId)!, date, slots: res.slots };
}

export async function requestBooking(db: Db, sms: SmsProvider, slug: string, input: Record<string, unknown>, now = new Date()) {
  const serviceId = str(input.serviceId, 60);
  const start = str(input.start, 16);
  const customerName = str(input.customerName, 80);
  const customerPhone = normalizePhone(str(input.customerPhone, 30));
  if (!isLocalDateTime(start)) throw new ServiceError('start must be "YYYY-MM-DDTHH:mm" in the shop\'s local time.');
  if (!customerName) throw new ServiceError("customer_name is required.");
  if (!customerPhone) throw new ServiceError("customer_phone must be a valid phone number.");
  const via = str(input.via, 40).replace(/[^\p{L}\p{N} .\-_]/gu, "") || "an AI assistant";

  const outgoing: Outgoing[] = [];
  const result = await db.update((data) => {
    const shop = data.shops.find((s) => s.slug === slug && s.published);
    if (!shop) throw new ServiceError(`No shop "${slug}".`, 404);
    outgoing.push(...sweep(data, sms, now, shop.id));
    const service = shop.services.find((s) => s.id === serviceId);
    if (!service) throw new ServiceError(`Unknown service "${serviceId}".`);
    const mine = data.bookings.filter((b) => b.shopId === shop.id);
    const open = mine.filter((b) => b.status === "pending" && holdsSlot(b, now));
    if (open.length >= LIMITS.pendingPerShop) throw new ServiceError("This shop has too many unanswered requests right now. Call instead.", 429);
    if (open.filter((b) => b.customerPhone === customerPhone).length >= LIMITS.pendingPerCustomerPerShop) {
      throw new ServiceError("This customer already has open requests here. Wait for an answer first.", 429);
    }
    const slots = availableSlots(shop, mine, serviceId, start.slice(0, 10), now);
    if (!slots.ok) throw new ServiceError(slots.reason);
    if (!slots.slots.includes(start)) throw new ServiceError("That time isn't available. Check availability again.", 409);

    let code = shop.nextCode;
    while (open.some((b) => b.code === code)) code = (code % 9999) + 1;
    shop.nextCode = (code % 9999) + 1;

    const booking: Booking = {
      id: newToken(16),
      code,
      shopId: shop.id,
      serviceId,
      serviceName: service.name,
      start,
      durationMinutes: service.durationMinutes,
      customerName,
      customerPhone,
      notifyCustomer: input.notifyCustomer === true,
      notes: str(input.notes, 300),
      via,
      status: "pending",
      createdAt: now.toISOString(),
      respondBy: new Date(now.getTime() + shop.replyWindowMinutes * 60000).toISOString(),
      decidedAt: null,
      ownerNote: "",
    };
    data.bookings.push(booking);
    outgoing.push(queue(data, sms, shop, booking, "owner", shop.ownerSms, text.ownerNewRequest(shop, booking), now));
    return { shop, booking };
  });
  await deliver(db, sms, outgoing);
  return result;
}

export async function getBooking(db: Db, sms: SmsProvider, id: string, now = new Date()) {
  const outgoing: Outgoing[] = [];
  const result = await db.update((data) => {
    const booking = data.bookings.find((b) => b.id === id);
    if (!booking) throw new ServiceError("No booking with that id.", 404);
    outgoing.push(...sweep(data, sms, now, booking.shopId));
    return { booking, shop: data.shops.find((s) => s.id === booking.shopId)! };
  });
  await deliver(db, sms, outgoing);
  return result;
}

export async function cancelBooking(db: Db, sms: SmsProvider, id: string, now = new Date()) {
  const outgoing: Outgoing[] = [];
  const result = await db.update((data) => {
    const booking = data.bookings.find((b) => b.id === id);
    if (!booking) throw new ServiceError("No booking with that id.", 404);
    outgoing.push(...sweep(data, sms, now, booking.shopId));
    const shop = data.shops.find((s) => s.id === booking.shopId)!;
    if (booking.status !== "pending" && booking.status !== "confirmed") throw new ServiceError(`This booking is already ${booking.status}.`, 409);
    const wasConfirmed = booking.status === "confirmed";
    booking.status = "cancelled";
    booking.decidedAt = now.toISOString();
    if (wasConfirmed) outgoing.push(queue(data, sms, shop, booking, "owner", shop.ownerSms, text.ownerCancelled(booking), now));
    return { booking, shop };
  });
  await deliver(db, sms, outgoing);
  return result;
}

function decide(data: Data, sms: SmsProvider, shop: Shop, booking: Booking, action: "confirm" | "decline", note: string, now: Date): Outgoing[] {
  booking.status = action === "confirm" ? "confirmed" : "declined";
  booking.decidedAt = now.toISOString();
  booking.ownerNote = note.slice(0, 200);
  if (!booking.notifyCustomer) return [];
  const body = action === "confirm" ? text.customerConfirmed(shop, booking) : text.customerDeclined(shop, booking);
  return [queue(data, sms, shop, booking, "customer", booking.customerPhone, body, now)];
}

/** An owner's text reply. Returns the acknowledgement text (sent back by TwiML or shown in the outbox). */
export async function handleOwnerText(db: Db, sms: SmsProvider, from: string, body: string, now = new Date()) {
  const phone = normalizePhone(from) ?? from;
  const outgoing: Outgoing[] = [];
  const reply = await db.update((data) => {
    const shops = data.shops.filter((s) => s.ownerSms === phone);
    if (shops.length === 0) return null;
    for (const s of shops) outgoing.push(...sweep(data, sms, now, s.id));
    const inbound: Message = {
      id: newToken(9),
      shopId: shops[0].id,
      bookingId: null,
      to: "owner",
      direction: "in",
      phone,
      body: body.slice(0, 500),
      at: now.toISOString(),
      provider: sms.name,
      delivery: "received",
    };
    data.messages.push(inbound);

    const parsed = parseReply(body);
    const ids = new Set(shops.map((s) => s.id));
    const pending = data.bookings.filter((b) => ids.has(b.shopId) && b.status === "pending").sort((a, b) => a.code - b.code);
    let ack: string;
    let target: Booking | undefined;

    if (parsed.action === "help") ack = text.ownerHelp(pending);
    else if (parsed.action === "unknown") ack = text.ownerNotFound(null);
    else {
      if (parsed.code !== null) {
        const matches = pending.filter((b) => b.code === parsed.code);
        target = matches[0];
        if (!target) {
          const done = data.bookings.find((b) => ids.has(b.shopId) && b.code === parsed.code && b.status !== "pending");
          ack = done ? text.ownerTooLate(done) : text.ownerNotFound(parsed.code);
        } else ack = "";
      } else if (pending.length === 1) {
        target = pending[0];
        ack = "";
      } else {
        ack = pending.length === 0 ? text.ownerHelp(pending) : text.ownerNeedsCode(pending);
      }
      if (target) {
        const shop = shops.find((s) => s.id === target!.shopId)!;
        inbound.bookingId = target.id;
        outgoing.push(...decide(data, sms, shop, target, parsed.action, parsed.note, now));
        ack = text.ownerAck(target);
      }
    }
    const shop = shops.find((s) => s.id === target?.shopId) ?? shops[0];
    // The acknowledgement goes back to the owner either way; record it.
    data.messages.push({
      id: newToken(9),
      shopId: shop.id,
      bookingId: target?.id ?? null,
      to: "owner",
      direction: "out",
      phone,
      body: ack,
      at: now.toISOString(),
      provider: sms.name,
      delivery: sms.name === "twilio" ? "sent" : "queued",
    });
    return ack;
  });
  await deliver(db, sms, outgoing);
  return reply;
}

/** The owner's web dashboard can confirm or decline too, for owners who'd rather tap than text. */
export async function decideFromDashboard(db: Db, sms: SmsProvider, secret: string, bookingId: string, action: "confirm" | "decline", note: string, now = new Date()) {
  const owner = await getOwnerShop(db, secret);
  const outgoing: Outgoing[] = [];
  const booking = await db.update((data) => {
    outgoing.push(...sweep(data, sms, now, owner.id));
    const b = data.bookings.find((x) => x.id === bookingId && x.shopId === owner.id);
    if (!b) throw new ServiceError("No such booking.", 404);
    if (b.status !== "pending") throw new ServiceError(`Already ${b.status}.`, 409);
    outgoing.push(...decide(data, sms, data.shops.find((s) => s.id === owner.id)!, b, action, str(note, 200), now));
    return b;
  });
  await deliver(db, sms, outgoing);
  return booking;
}

export async function ownerDashboard(db: Db, sms: SmsProvider, secret: string, now = new Date()) {
  const owner = await getOwnerShop(db, secret);
  const outgoing: Outgoing[] = [];
  const view = await db.update((data) => {
    outgoing.push(...sweep(data, sms, now, owner.id));
    const shop = data.shops.find((s) => s.id === owner.id)!;
    const bookings = data.bookings.filter((b) => b.shopId === shop.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const monthPrefix = now.toISOString().slice(0, 7);
    return {
      shop,
      bookings: bookings.slice(0, 100),
      messages: data.messages.filter((m) => m.shopId === shop.id).slice(-60),
      stats: {
        pending: bookings.filter((b) => b.status === "pending").length,
        confirmedThisMonth: bookings.filter((b) => b.status === "confirmed" && b.createdAt.startsWith(monthPrefix)).length,
        requestsThisMonth: bookings.filter((b) => b.createdAt.startsWith(monthPrefix)).length,
      },
    };
  });
  await deliver(db, sms, outgoing);
  return view;
}

/** Messages for a demo shop's simulated phone. */
export async function demoPhone(db: Db, slug: string) {
  return db.read((d) => {
    const shop = d.shops.find((s) => s.slug === slug && s.demo);
    if (!shop) throw new ServiceError("Not a demo shop.", 404);
    return {
      shop: summarizeShop(shop),
      ownerSms: shop.ownerSms,
      messages: d.messages.filter((m) => m.shopId === shop.id && m.phone === shop.ownerSms).slice(-30),
      customerMessages: d.messages.filter((m) => m.shopId === shop.id && m.to === "customer").slice(-10),
    };
  });
}
