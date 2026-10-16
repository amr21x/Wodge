// This temporary as partykit does not support bindings yet

import { sign } from "@/lib/utils/sign";
import { removeMember } from "@/lib/data-server";
import { env } from "@wodge/env";

export async function POST(
  req: Request,
  { params: { workspaceId } }: { params: { workspaceId: string } },
) {
  const userId = req.headers.get("x-user-id");

  if (!userId) return new Response(null, { status: 401 });

  const token = await sign({ userId });

  const res = await fetch(
    `${env.BACKEND_DOMAIN}/parties/workspace/${workspaceId}/leave?token=${token}`,
    {
      method: "POST",
    },
  );

  if (res.ok) {
    await removeMember(userId, workspaceId);
    return new Response(null, { status: 200 });
  }

  return new Response(null, { status: 400 });
}
