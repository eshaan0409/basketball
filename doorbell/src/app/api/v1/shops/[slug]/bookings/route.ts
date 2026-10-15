import { clientIp, CORS, handle, json, rateLimit, readJson, ready } from "@/lib/http";
import { getSmsProvider } from "@/lib/sms";
import { runTool } from "@/lib/tools";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(request: Request, { params }: Ctx) {
  return handle(async () => {
    rateLimit(`rest:${clientIp(request)}`, 20, 60_000);
    const body = await readJson(request);
    const db = await ready();
    const agent = (request.headers.get("user-agent") ?? "").split("/")[0].slice(0, 40);
    const result = await runTool("request_booking", { ...body, shop: (await params).slug }, { db, sms: getSmsProvider(), agentName: agent || undefined });
    return json(result, 201, CORS);
  }, CORS);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
