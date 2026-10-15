import { currentOwner, handle, json } from "@/lib/http";
import { revokeShare } from "@/lib/service";
import { getStore } from "@/lib/store";
import { ownerView } from "@/lib/views";

type Ctx = { params: Promise<{ token: string }> };

export async function DELETE(_request: Request, { params }: Ctx) {
  return handle(async () => {
    const profile = await currentOwner();
    await revokeShare(getStore(), profile, (await params).token);
    return json(ownerView(profile));
  });
}
