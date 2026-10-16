// This temporary as partykit does not support bindings yet

import { deleteWorkspace, removeMember } from "@/lib/data-server";
import { env } from "@wodge/env";
import { sign } from "../../../../lib/utils/sign";
import { isWorkspaceAdmin } from "../is-workspace-admin";

export async function DELETE(
  req: Request,
  { params: { workspaceId } }: { params: { workspaceId: string } },
) {
  const userId = req.headers.get("x-user-id");

  if (!userId) return new Response(null, { status: 401 });

  if (!(await isWorkspaceAdmin(userId, workspaceId)))
    return new Response(null, { status: 401 });

  await deleteWorkspace(workspaceId);

  const token = await sign({ userId });
  // inform DO
  const res = await fetch(
    `${env.BACKEND_DOMAIN}/parties/workspace/${workspaceId}?token=${token}`,
    {
      method: "DELETE",
    },
  );

  if (!res.ok) return new Response(null, { status: 500 });

  return new Response(null, { status: 204 });
}
