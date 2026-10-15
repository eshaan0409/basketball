import { TOOLS } from "./tools";

/** Absolute base URL for links in machine-readable files. */
export function baseUrl(request: Request): string {
  if (process.env.PUBLIC_BASE_URL) return process.env.PUBLIC_BASE_URL.replace(/\/$/, "");
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `${proto}://${host}`;
}

export function llmsTxt(base: string): string {
  const tools = TOOLS.map((t) => `- ${t.name}: ${t.description}`).join("\n");
  return `# Doorbell

> Doorbell lets AI assistants book appointments at local shops that have no booking software: auto repair, barbers, salons, tire shops and more. The shop owner confirms each request by text message, usually within minutes.

## For AI assistants

- MCP server (Streamable HTTP, stateless, no auth): ${base}/api/mcp
- REST API: ${base}/api/openapi.json
- A request is not a booking until the owner confirms it. Check status with get_booking_status and tell the person the outcome.
- Ask the person before you request a booking, and only send the phone number they gave you.

## Tools

${tools}

## Pages

- [How it works for shops](${base}/)
- [Connect an assistant](${base}/agents)
`;
}

export function openApi(base: string) {
  const bookingSchema = {
    type: "object",
    properties: {
      booking_id: { type: "string" },
      status: { type: "string", enum: ["pending", "confirmed", "declined", "expired", "cancelled"] },
      message: { type: "string" },
      start: { type: "string", description: "Local time YYYY-MM-DDTHH:mm" },
      start_display: { type: "string" },
      timezone: { type: "string" },
    },
  };
  return {
    openapi: "3.1.0",
    info: {
      title: "Doorbell",
      version: "0.1.0",
      description: "Book appointments at local shops. Owners confirm by text; requests are pending until they do.",
    },
    servers: [{ url: `${base}/api/v1` }],
    paths: {
      "/shops": {
        get: {
          operationId: "searchShops",
          summary: "Search shops",
          parameters: [
            { name: "query", in: "query", schema: { type: "string" } },
            { name: "category", in: "query", schema: { type: "string" } },
            { name: "city", in: "query", schema: { type: "string" } },
          ],
          responses: { "200": { description: "Matching shops" } },
        },
      },
      "/shops/{slug}": {
        get: {
          operationId: "getShop",
          summary: "Shop details, services and hours",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Shop" }, "404": { description: "Not found" } },
        },
      },
      "/shops/{slug}/availability": {
        get: {
          operationId: "checkAvailability",
          summary: "Open start times",
          parameters: [
            { name: "slug", in: "path", required: true, schema: { type: "string" } },
            { name: "service_id", in: "query", required: true, schema: { type: "string" } },
            { name: "date", in: "query", schema: { type: "string", description: "YYYY-MM-DD; omit for soonest" } },
          ],
          responses: { "200": { description: "Slots" } },
        },
      },
      "/shops/{slug}/bookings": {
        post: {
          operationId: "requestBooking",
          summary: "Request a booking (the owner confirms by text)",
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["service_id", "start", "customer_name", "customer_phone"],
                  properties: {
                    service_id: { type: "string" },
                    start: { type: "string" },
                    customer_name: { type: "string" },
                    customer_phone: { type: "string" },
                    notify_customer_by_text: { type: "boolean" },
                    notes: { type: "string" },
                    agent_name: { type: "string" },
                  },
                },
              },
            },
          },
          responses: { "201": { description: "Pending booking", content: { "application/json": { schema: bookingSchema } } } },
        },
      },
      "/bookings/{id}": {
        get: {
          operationId: "getBookingStatus",
          summary: "Booking status",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Booking", content: { "application/json": { schema: bookingSchema } } } },
        },
        delete: {
          operationId: "cancelBooking",
          summary: "Cancel a booking",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Cancelled booking" } },
        },
      },
    },
  };
}
