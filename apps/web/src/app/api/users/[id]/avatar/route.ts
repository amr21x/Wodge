import { sign } from "@/lib/utils/sign";
import { makeUserAvatarKey, makeWorkspaceAvatarKey } from "@wodge/data";
import { getAvatarAddress } from "@wodge/data/browser";
import { updateUserById, updateWorkspaceById } from "@/lib/data-server";
import { env } from "@wodge/env";
import { redirect } from "next/navigation";

export async function POST(
  req: Request,
  { params: { id } }: { params: { id: string } },
) {
  const userId = req.headers.get("x-user-id");

  const key = req.headers.get("key");

  if (!userId || !key || userId !== id) {
    return new Response(null, { status: 400 });
  }

  await updateUserById(userId, {
    avatar: getAvatarAddress(makeUserAvatarKey(key)),
  });

  return new Response(null, { status: 200 });
}

export async function DELETE(
  req: Request,
  { params: { id } }: { params: { id: string } },
) {
  const userId = req.headers.get("x-user-id");

  if (!userId || userId !== id) {
    return new Response(null, { status: 400 });
  }

  const token = await sign({ userId });

  const { user } = await updateUserById(userId, {
    avatar: null,
  });

  if (!user) {
    console.log("errorr");
    return new Response(null, { status: 404 });
  }

  console.log(user);

  if (!user.avatar?.startsWith(env.NEXT_PUBLIC_AVATARS_URL)) {
    return new Response(null, { status: 204 });
  }

  return redirect(
    `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/parties/user/${userId}/avatar?token=${token}&key=${user.avatar?.split("/").pop()}`,
  );
}
