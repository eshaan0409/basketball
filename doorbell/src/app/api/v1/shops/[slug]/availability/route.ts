import { CORS, handle, json, ready } from "@/lib/http";
import { getSmsProvider } from "@/lib/sms";
import { runTool } from "@/lib/tools";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(request: Request, { params }: Ctx) {
  return handle(async () => {
    const q = new URL(request.url).searchParams;
    const db = await ready();
    const args = { shop: (await params).slug, service_id: q.get("service_id") ?? "", date: q.get("date") ?? "" };
    return json(await runTool("check_availability", args, { db, sms: getSmsProvider() }), 200, CORS);
  }, CORS);
}
