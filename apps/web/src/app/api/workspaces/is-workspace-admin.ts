import { sign } from "@/lib/utils/sign";
import { env } from "@wodge/env";

export async function isWorkspaceAdmin(userId: string, workspaceId: string) {
  const token = await sign({ userId });

  const res = await fetch(
    `${env.BACKEND_DOMAIN}/parties/workspace/${workspaceId}/service/isAdmin?token=${token}`,
    { headers: { authorization: env.SECRET_KEY as string } }
  );

  if (res.ok) return true;

  return false;
}
