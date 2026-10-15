import { clientIp, CORS, ready, rateLimit } from "@/lib/http";
import { handleRpc, RPC } from "@/lib/mcp";
import { ServiceError } from "@/lib/service";
import { getSmsProvider } from "@/lib/sms";

/** MCP over Streamable HTTP, stateless: POST a JSON-RPC message, get one JSON response. */
export async function POST(request: Request) {
  let message: unknown;
  try {
    message = await request.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: RPC.PARSE, message: "Parse error" } }, { status: 400, headers: CORS });
  }
  const m = message as { method?: string; params?: { name?: string } };
  if (m?.method === "tools/call" && (m.params?.name === "request_booking" || m.params?.name === "cancel_booking")) {
    try {
      rateLimit(`mcp:${clientIp(request)}`, 20, 60_000);
    } catch (e) {
      const id = (message as { id?: string | number }).id ?? null;
      return Response.json({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: (e as ServiceError).message }], isError: true } }, { headers: CORS });
    }
  }
  const db = await ready();
  const agentName = (request.headers.get("user-agent") ?? "").split("/")[0].slice(0, 40) || undefined;
  const response = await handleRpc(message, { db, sms: getSmsProvider(), agentName });
  if (response === null) return new Response(null, { status: 202, headers: CORS });
  return Response.json(response, { headers: { ...CORS, "Cache-Control": "no-store" } });
}

/** No server-initiated stream: the spec says answer GET with 405 in that case. */
export function GET() {
  return new Response("This MCP server is stateless. POST JSON-RPC messages to this URL.", { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { ...CORS, Allow: "POST, OPTIONS" } });
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
