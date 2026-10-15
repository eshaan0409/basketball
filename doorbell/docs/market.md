# Market check: Doorbell

Checked 2026-10-15.

**Claim:** a neutral booking layer AI assistants can call (MCP + REST) for local shops with no booking software,
where the owner confirms each request by text, paid per confirmed booking.

## What exists

| Who | What | Relevance |
|---|---|---|
| [Google "Ask for Me"](https://techcrunch.com/2025/01/30/googles-ask-for-me-feature-calls-businesses-on-your-behalf-to-inquire-about-services-pricing/) | Search Labs experiment (Jan 2025): Google's AI phones nail salons and auto shops to ask about pricing and availability, then summarizes by text or email. Businesses can opt out in their Business Profile. | **The closest thing, and the biggest risk.** Same shops, same problem. It gathers information by calling; it doesn't book. Doorbell books, works with any assistant, and the owner opts in and answers by text instead of picking up the phone mid-job. If Google adds booking, Doorbell's edge is neutrality and owner consent. |
| AI phone receptionists (e.g. [Goodcall](https://www.goodcall.com/voice-ai/ai-voice-agent-for-appointment-booking)) | SaaS voice agents that answer a shop's phone and book. | Adjacent: the shop has to buy and set up software. Doorbell's target has none and wants none. |
| Booking platforms (OpenTable, Booksy, Fresha, Square) | Per-booking or subscription booking software; some are reachable by agents. | Precedent for per-booking fees. They cover shops that already use software. |
| MCP for local business ([overview](https://getaiform.com/blog/how-ai-agents-find-book-services-mcp-for-businesses-complete-guide)) | Guides describe agents booking through MCP marketplaces, mostly conceptually. | We found no live neutral booking layer for shops with no software. |

## What's open

Shops with no website and no booking software (the Sites for Shops call sheet: 8 Sacramento storefronts open 10–29
years) are invisible to assistants that book. Nobody we found gives them a bookable presence without new software.

## Risks to check next

- Google extending Ask for Me to booking; Yelp, Square or Booksy launching the same for their non-customers.
- Will assistants call a third-party MCP server? Today that needs the user to add a connector. Directory listings
  (being where assistants already look) may matter more than the protocol.
- SMS rules: owner opt-in, customer consent for texts, carrier registration (A2P 10DLC) before real traffic.
