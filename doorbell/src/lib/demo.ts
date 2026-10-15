import type { Db } from "./db";
import { createShop } from "./service";

/**
 * FICTIONAL demo shops. Names are invented, and phone numbers use the 555-01xx range reserved for fiction.
 * Their booking texts go to the on-screen "owner's phone" on /demo, never to a real phone.
 */
const weekday = (open: string, close: string) => [{ open, close }];

export const DEMO_SHOPS = [
  {
    slug: "riverbend-auto-demo",
    input: {
      name: "Riverbend Auto Care (Demo)",
      category: "Auto repair",
      description: "Demo shop. Family-run repair shop: oil, brakes, tires, diagnostics.",
      address: { street: "4200 Riverbend Rd", city: "Sacramento", state: "CA", zip: "95826" },
      phone: "(916) 555-0142",
      ownerSms: "(916) 555-0143",
      timezone: "America/Los_Angeles",
      hours: [[], weekday("08:00", "17:30"), weekday("08:00", "17:30"), weekday("08:00", "17:30"), weekday("08:00", "17:30"), weekday("08:00", "17:30"), weekday("09:00", "14:00")],
      services: [
        { name: "Oil change", durationMinutes: 30, priceText: "$49–79", description: "Conventional or synthetic." },
        { name: "Brake inspection", durationMinutes: 45, priceText: "Free", description: "" },
        { name: "Tire rotation", durationMinutes: 30, priceText: "$25", description: "" },
        { name: "Check engine light diagnosis", durationMinutes: 60, priceText: "$95", description: "" },
      ],
      capacity: 2,
      slotMinutes: 30,
      leadMinutes: 60,
      horizonDays: 14,
      replyWindowMinutes: 30,
      published: true,
    },
  },
  {
    slug: "fifth-street-barbers-demo",
    input: {
      name: "Fifth Street Barbers (Demo)",
      category: "Barbershop",
      description: "Demo shop. Walk-ins welcome; book ahead for fades.",
      address: { street: "1500 5th St", city: "Sacramento", state: "CA", zip: "95814" },
      phone: "(916) 555-0177",
      ownerSms: "(916) 555-0178",
      timezone: "America/Los_Angeles",
      hours: [weekday("10:00", "15:00"), [], weekday("09:00", "18:00"), weekday("09:00", "18:00"), weekday("09:00", "18:00"), weekday("09:00", "19:00"), weekday("09:00", "17:00")],
      services: [
        { name: "Haircut", durationMinutes: 30, priceText: "$30", description: "" },
        { name: "Fade", durationMinutes: 45, priceText: "$35", description: "" },
        { name: "Beard trim", durationMinutes: 15, priceText: "$15", description: "" },
        { name: "Kids cut", durationMinutes: 30, priceText: "$22", description: "12 and under." },
      ],
      capacity: 3,
      slotMinutes: 15,
      leadMinutes: 30,
      horizonDays: 14,
      replyWindowMinutes: 20,
      published: true,
    },
  },
];

/** Create the demo shops if they're missing. Safe to call on every request. */
export async function ensureDemoShops(db: Db) {
  const existing = await db.read((d) => new Set(d.shops.filter((s) => s.demo).map((s) => s.slug)));
  for (const demo of DEMO_SHOPS) {
    if (!existing.has(demo.slug)) await createShop(db, demo.input, new Date(), { demo: true, slug: demo.slug });
  }
}
