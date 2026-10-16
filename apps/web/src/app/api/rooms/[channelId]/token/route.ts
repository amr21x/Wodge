import { sign } from "@/lib/utils/sign";
import { getUserById } from "@/lib/data-server";
import { env } from "@wodge/env";
import { redirect } from "next/navigation";

export async function GET(
  req: Request,
  { params: { channelId } }: { params: { channelId: string } },
) {
  const userId = req.headers.get("x-user-id");

  if (!userId) return new Response("Unauthorized", { status: 401 });

  const user = await getUserById(userId);

  if (!user) return new Response("Unauthorized", { status: 401 });

  const token = await sign({ userId, username: user.username });

  return redirect(
    `${env.BACKEND_DOMAIN}/parties/room/${channelId}/token?token=${token}`,
  );
}
