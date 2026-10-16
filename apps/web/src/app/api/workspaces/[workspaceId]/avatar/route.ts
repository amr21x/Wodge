import { sign } from "@/lib/utils/sign";
import { makeWorkspaceAvatarKey } from "@wodge/data";
import { getAvatarAddress } from "@wodge/data/browser";
import { updateUserById, updateWorkspaceById } from "@/lib/data-server";
import { env } from "@wodge/env";
import { redirect } from "next/navigation";
import { isWorkspaceAdmin } from "../../is-workspace-admin";

export async function POST(
  req: Request,
  { params: { workspaceId } }: { params: { workspaceId: string } },
) {
  const userId = req.headers.get("x-user-id");

  const key = req.headers.get("key");

  if (!userId || !key) {
    return new Response(null, { status: 400 });
  }

  if (!(await isWorkspaceAdmin(userId, workspaceId)))
    return new Response(null, { status: 401 });

  await updateWorkspaceById(workspaceId, {
    avatar: getAvatarAddress(makeWorkspaceAvatarKey(key)),
  });

  return new Response(null, { status: 200 });
}

export async function DELETE(
  req: Request,
  { params: { workspaceId } }: { params: { workspaceId: string } },
) {
  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return new Response(null, { status: 400 });
  }

  if (!(await isWorkspaceAdmin(userId, workspaceId)))
    return new Response(null, { status: 401 });

  const token = await sign({ userId });

  const workspace = await updateWorkspaceById(workspaceId, {
    avatar: null,
  });

  if (!workspace) {
    return new Response(null, { status: 400 });
  }

  return redirect(
    `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/parties/workspace/${workspaceId}/avatar?token=${token}&key=${workspace.avatar?.split("/").pop()}`,
  );
}
