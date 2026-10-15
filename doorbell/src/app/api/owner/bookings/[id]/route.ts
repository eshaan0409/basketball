import { handle, json, ownerSecret, readJson, ready } from "@/lib/http";
import { decideFromDashboard, ServiceError } from "@/lib/service";
import { getSmsProvider } from "@/lib/sms";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  return handle(async () => {
    const { action, note } = await readJson(request);
    if (action !== "confirm" && action !== "decline") throw new ServiceError("action must be confirm or decline.");
    const db = await ready();
    const booking = await decideFromDashboard(db, getSmsProvider(), (await ownerSecret()) ?? "", (await params).id, action, String(note ?? ""));
    return json({ status: booking.status });
  });
}
