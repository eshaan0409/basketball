# Doorbell

Let AI assistants book shops that have no booking software. The owner answers by text.

A customer asks their assistant ("oil change tomorrow morning near downtown"). The assistant finds the shop through
Doorbell, sees real hours and open times, and requests a slot. The owner gets a text, replies `Y12` or `N12 try 2pm`,
and the assistant (and, if they agreed, the customer) hears back. Unanswered requests expire; nothing is booked
until the owner says yes.

The business: free to list; a fee per confirmed booking (amount not decided; `site.feePerConfirmedBooking`).

## What works today

- **For assistants**
  - MCP server at `/api/mcp`: Streamable HTTP, stateless, protocol versions 2025-06-18 / 2025-03-26 / 2024-11-05.
    Six tools: `search_shops`, `get_shop`, `check_availability`, `request_booking`, `get_booking_status`, `cancel_booking`.
  - REST at `/api/v1/...`, described in `/api/openapi.json`; `/llms.txt` for language models.
  - Each shop page (`/s/<slug>`) carries schema.org JSON-LD (hours, services, address).
- **For owners**
  - Setup form (`/owner/start`): hours, services with duration and price, capacity, notice, reply window.
  - Booking texts and replies. The parser accepts `Y12`, `y 12`, `yes`, `12 yes`, `N12 try 4pm`, `HELP`, and a bare
    `Y` when only one request is open.
  - Dashboard (`/owner`) with confirm/decline buttons, upcoming bookings, an on-screen phone while real SMS is off,
    and editing.
- **Availability engine**: open intervals, slot size, service duration, minimum notice, booking horizon, closed
  dates, and capacity (peak simultaneous bookings, not just a count). Pending requests hold their slot until they
  expire. Times are wall-clock in the shop's timezone.
- **Texting**: Twilio when `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` are set; otherwise an on-screen
  outbox. The inbound webhook (`/api/sms/inbound`) checks Twilio's signature and is off without a token.
- **Demo** (`/demo`): two fictional shops; an assistant panel that calls the real MCP endpoint and an owner's phone
  you reply from. Visitors only see texts for their own bookings, with phone numbers masked.
- **Guardrails**: per-IP rate limit on booking requests, at most 2 open requests per customer per shop, 25 per shop;
  customers are texted only if they agreed.

## Run it

```bash
npm install
npm run dev     # http://localhost:3000, then open /demo
npm test        # 41 tests: availability, reply parsing, booking lifecycle, MCP protocol, Twilio signatures
npm run build
```

Try the MCP server from a terminal:

```bash
curl -s localhost:3000/api/mcp -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_shops","arguments":{"query":"oil change"}}}'
```

## Deploy

Vercel, Root Directory `doorbell`. Like Vouched, it stores data in a JSON file that is **not durable on serverless
hosts**; replace `src/lib/db.ts`'s `FileDb` with Postgres before real shops use it. For real texts: a Twilio number,
the three env vars above, `PUBLIC_BASE_URL`, and the number's incoming-message webhook set to
`<PUBLIC_BASE_URL>/api/sms/inbound`.

## Next

1. Database, then real SMS (needs A2P 10DLC registration in the US).
2. Get listed where assistants already look (connector directories), not only reachable by URL.
3. Onboard the 8 Sacramento shops from the Sites for Shops call sheet, in person, as the first cohort.
4. Owner sign-in by text (magic code) instead of a private key.
5. Billing per confirmed booking.
