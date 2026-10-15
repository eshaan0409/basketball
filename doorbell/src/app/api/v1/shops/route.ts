import { CORS, handle, json, ready } from "@/lib/http";
import { runTool } from "@/lib/tools";
import { getSmsProvider } from "@/lib/sms";

export async function GET(request: Request) {
  return handle(async () => {
    const q = new URL(request.url).searchParams;
    const db = await ready();
    const result = await runTool("search_shops", { query: q.get("query") ?? "", category: q.get("category") ?? "", city: q.get("city") ?? "" }, { db, sms: getSmsProvider() });
    return json(result, 200, CORS);
  }, CORS);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
