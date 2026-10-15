import { CORS, handle, json, ready } from "@/lib/http";
import { getSmsProvider } from "@/lib/sms";
import { runTool } from "@/lib/tools";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  return handle(async () => {
    const db = await ready();
    return json(await runTool("get_booking_status", { booking_id: (await params).id }, { db, sms: getSmsProvider() }), 200, CORS);
  }, CORS);
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return handle(async () => {
    const db = await ready();
    return json(await runTool("cancel_booking", { booking_id: (await params).id }, { db, sms: getSmsProvider() }), 200, CORS);
  }, CORS);
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}
