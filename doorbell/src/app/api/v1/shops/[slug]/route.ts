import { CORS, handle, json, ready } from "@/lib/http";
import { getSmsProvider } from "@/lib/sms";
import { runTool } from "@/lib/tools";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  return handle(async () => {
    const db = await ready();
    return json(await runTool("get_shop", { shop: (await params).slug }, { db, sms: getSmsProvider() }), 200, CORS);
  }, CORS);
}
