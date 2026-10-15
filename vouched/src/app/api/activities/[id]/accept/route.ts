import { currentOwner, handle, json, readBody } from "@/lib/http";
import { acceptCorrection } from "@/lib/service";
import { getStore } from "@/lib/store";
import { ownerView } from "@/lib/views";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Ctx) {
  return handle(async () => {
    const profile = await currentOwner();
    const { statementKey } = await readBody(request);
    await acceptCorrection(getStore(), profile, (await params).id, String(statementKey ?? ""));
    return json(ownerView(profile));
  });
}
