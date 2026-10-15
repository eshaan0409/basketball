import type { Db } from "./db";
import { statusSentence } from "./messages";
import { formatPhone } from "./replies";
import {
  cancelBooking,
  checkAvailability,
  getBooking,
  getShop,
  requestBooking,
  searchShops,
  ServiceError,
  summarizeShop,
} from "./service";
import type { SmsProvider } from "./sms";
import { dayName, formatClock, formatSlot } from "./time";
import type { Booking, Shop } from "./types";

/**
 * The agent-facing surface, shared by the MCP server and the REST API. Each tool takes plain JSON arguments and
 * returns plain JSON. Errors are ServiceErrors with a message an assistant can relay to a person.
 */

export interface ToolContext {
  db: Db;
  sms: SmsProvider;
  now?: Date;
  /** Who is calling, when the transport knows (MCP clientInfo, User-Agent). */
  agentName?: string;
}

type JsonSchema = Record<string, unknown>;

export interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: JsonSchema;
  annotations: { readOnlyHint: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint: boolean };
  run: (args: Record<string, unknown>, ctx: ToolContext) => Promise<Record<string, unknown>>;
}

function hoursText(shop: Shop): string[] {
  return shop.hours.map((day, i) => {
    const label = dayName(i, true);
    if (day.length === 0) return `${label}: closed`;
    return `${label}: ${day.map((iv) => `${formatClock(iv.open)}–${formatClock(iv.close)}`).join(", ")}`;
  });
}

export function bookingView(shop: Shop, b: Booking) {
  return {
    booking_id: b.id,
    status: b.status,
    message: statusSentence(shop, b),
    shop: { slug: shop.slug, name: shop.name, phone: formatPhone(shop.phone) },
    service: b.serviceName,
    start: b.start,
    start_display: formatSlot(b.start),
    timezone: shop.timezone,
    duration_minutes: b.durationMinutes,
    customer_name: b.customerName,
    owner_note: b.ownerNote || null,
    respond_by: b.status === "pending" ? b.respondBy : null,
  };
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

export const TOOLS: ToolDef[] = [
  {
    name: "search_shops",
    title: "Search local shops",
    description:
      "Find local service businesses (auto repair, barbers, salons, tire shops, and more) that take bookings through Doorbell. Returns each shop's slug and services. Use get_shop or check_availability next.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "What the person needs, e.g. 'oil change' or 'fade haircut'." },
        category: { type: "string", description: "Optional category filter, e.g. 'Auto repair', 'Barbershop'." },
        city: { type: "string", description: "Optional city name or ZIP code." },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (args, ctx) => {
      const shops = await searchShops(ctx.db, args);
      return { count: shops.length, shops };
    },
  },
  {
    name: "get_shop",
    title: "Get shop details",
    description: "Hours, address, phone, services with IDs, durations and prices, and booking policies for one shop.",
    inputSchema: {
      type: "object",
      properties: { shop: { type: "string", description: "The shop's slug from search_shops." } },
      required: ["shop"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (args, ctx) => {
      const shop = await getShop(ctx.db, str(args.shop));
      return {
        ...summarizeShop(shop),
        description: shop.description,
        timezone: shop.timezone,
        hours: hoursText(shop),
        closed_dates: shop.closedDates,
        policies: {
          how_booking_works: `Requests go to the owner by text. They usually answer within ${shop.replyWindowMinutes} minutes; unanswered requests expire and nothing is booked.`,
          minimum_notice_minutes: shop.leadMinutes,
          book_up_to_days_ahead: shop.horizonDays,
        },
      };
    },
  },
  {
    name: "check_availability",
    title: "Check open times",
    description:
      "Open start times for a service, in the shop's local time (YYYY-MM-DDTHH:mm). Give a date for that day's times, or omit it for the soonest openings.",
    inputSchema: {
      type: "object",
      properties: {
        shop: { type: "string" },
        service_id: { type: "string", description: "A service id from get_shop." },
        date: { type: "string", description: "YYYY-MM-DD in the shop's timezone. Optional." },
      },
      required: ["shop", "service_id"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (args, ctx) => {
      const res = await checkAvailability(ctx.db, str(args.shop), str(args.service_id), str(args.date) || undefined, ctx.now);
      return {
        shop: res.shop.slug,
        service: { id: res.service.id, name: res.service.name, duration_minutes: res.service.durationMinutes, price: res.service.priceText },
        timezone: res.shop.timezone,
        date: res.date,
        slots: res.slots.map((s) => ({ start: s, display: formatSlot(s) })),
        note: res.slots.length === 0 ? "No open times. Try another date or call the shop." : "Times are held for nobody until requested.",
      };
    },
  },
  {
    name: "request_booking",
    title: "Request a booking",
    description:
      "Ask the shop for an appointment. The owner confirms or declines by text, usually within minutes. Returns a booking_id: check it with get_booking_status. Only use details the person gave you, and get their OK before requesting.",
    inputSchema: {
      type: "object",
      properties: {
        shop: { type: "string" },
        service_id: { type: "string" },
        start: { type: "string", description: "A start time from check_availability, YYYY-MM-DDTHH:mm." },
        customer_name: { type: "string" },
        customer_phone: { type: "string", description: "The person's phone number, so the shop can reach them." },
        notify_customer_by_text: {
          type: "boolean",
          description: "True only if the person agreed to get a text when the shop answers.",
        },
        notes: { type: "string", description: "Optional: car make/model, haircut style, anything the shop should know." },
        agent_name: { type: "string", description: "Your product's name, e.g. 'Claude' or 'ChatGPT'." },
      },
      required: ["shop", "service_id", "start", "customer_name", "customer_phone"],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    run: async (args, ctx) => {
      const { shop, booking } = await requestBooking(
        ctx.db,
        ctx.sms,
        str(args.shop),
        {
          serviceId: args.service_id,
          start: args.start,
          customerName: args.customer_name,
          customerPhone: args.customer_phone,
          notifyCustomer: args.notify_customer_by_text === true,
          notes: args.notes,
          via: str(args.agent_name) || ctx.agentName,
        },
        ctx.now,
      );
      return bookingView(shop, booking);
    },
  },
  {
    name: "get_booking_status",
    title: "Check a booking",
    description: "Whether the shop confirmed, declined, or hasn't answered yet. Poll every minute or two while pending.",
    inputSchema: {
      type: "object",
      properties: { booking_id: { type: "string" } },
      required: ["booking_id"],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    run: async (args, ctx) => {
      const { shop, booking } = await getBooking(ctx.db, ctx.sms, str(args.booking_id), ctx.now);
      return bookingView(shop, booking);
    },
  },
  {
    name: "cancel_booking",
    title: "Cancel a booking",
    description: "Cancel a pending or confirmed booking. The owner is told by text if it was confirmed.",
    inputSchema: {
      type: "object",
      properties: { booking_id: { type: "string" } },
      required: ["booking_id"],
    },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: true },
    run: async (args, ctx) => {
      const { shop, booking } = await cancelBooking(ctx.db, ctx.sms, str(args.booking_id), ctx.now);
      return bookingView(shop, booking);
    },
  },
];

export async function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext) {
  const tool = TOOLS.find((t) => t.name === name);
  if (!tool) throw new ServiceError(`Unknown tool "${name}".`, 404);
  return tool.run(args, ctx);
}
