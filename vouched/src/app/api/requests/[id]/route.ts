import { currentOwner, handle, json } from "@/lib/http";
import { cancelRequest } from "@/lib/service";
import { getStore } from "@/lib/store";
import { ownerView } from "@/lib/views";

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Ctx) {
  return handle(async () => {
    const profile = await currentOwner();
    await cancelRequest(getStore(), profile, (await params).id);
    return json(ownerView(profile));
  });
}
