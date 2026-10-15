export const CATEGORIES = [
  "Auto repair",
  "Tire shop",
  "Barbershop",
  "Hair salon",
  "Nail salon",
  "Pet grooming",
  "Phone and computer repair",
  "Tailor and alterations",
  "Other service",
] as const;
export type Category = (typeof CATEGORIES)[number];

/** "HH:mm" in the shop's local time. */
export interface OpenInterval {
  open: string;
  close: string;
}

/** Index 0 = Sunday … 6 = Saturday. An empty list means closed that day. */
export type WeeklyHours = OpenInterval[][];

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  /** Free text so owners can say "$45", "$40–60" or "Quote after inspection". */
  priceText: string;
  description: string;
}

export interface Shop {
  id: string;
  /** Public, URL-safe handle: /s/<slug>. */
  slug: string;
  ownerHash: string;
  name: string;
  category: Category;
  description: string;
  address: { street: string; city: string; state: string; zip: string };
  /** The shop's public phone, shown to customers. */
  phone: string;
  /** Where booking requests are texted. Private. E.164. */
  ownerSms: string;
  /** IANA zone, e.g. America/Los_Angeles. */
  timezone: string;
  hours: WeeklyHours;
  /** YYYY-MM-DD dates the shop is closed (holidays, vacation). */
  closedDates: string[];
  services: Service[];
  /** How many customers can be served at once (bays, chairs). */
  capacity: number;
  slotMinutes: number;
  /** Minimum notice for a booking. */
  leadMinutes: number;
  /** How far ahead bookings can be made. */
  horizonDays: number;
  /** How long the owner has to answer before a request expires. */
  replyWindowMinutes: number;
  published: boolean;
  demo: boolean;
  nextCode: number;
  createdAt: string;
}

export type BookingStatus = "pending" | "confirmed" | "declined" | "expired" | "cancelled";

export interface Booking {
  /** Unguessable. Knowing it is what lets an agent check status. */
  id: string;
  /** Short number for SMS replies: "Y12". Unique per shop. */
  code: number;
  shopId: string;
  serviceId: string;
  serviceName: string;
  /** Local wall-clock start, "YYYY-MM-DDTHH:mm" in the shop's timezone. */
  start: string;
  durationMinutes: number;
  customerName: string;
  /** E.164. */
  customerPhone: string;
  /** The customer agreed to receive texts about this booking. */
  notifyCustomer: boolean;
  notes: string;
  /** Who placed it: "Claude", "ChatGPT", "web", … as the agent reports itself. */
  via: string;
  status: BookingStatus;
  createdAt: string;
  respondBy: string;
  decidedAt: string | null;
  /** The owner's note to the customer, e.g. a suggested time. */
  ownerNote: string;
}

export interface Message {
  id: string;
  shopId: string;
  bookingId: string | null;
  to: "owner" | "customer";
  direction: "out" | "in";
  phone: string;
  body: string;
  at: string;
  provider: "outbox" | "twilio";
  /** For outbound: whether the provider accepted it. */
  delivery: "queued" | "sent" | "failed" | "received";
}
