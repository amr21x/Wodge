import { currentUser } from "@/lib/supabase/current-user";
import { sign } from "@/lib/utils/sign";
import { UpdateUserSchema } from "@wodge/data";
import { updateUserById } from "@/lib/data-server";
import { env } from "@wodge/env";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  // 1. Authenticate access

  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();

  // 2. Validate data
  const validatedFields = UpdateUserSchema.safeParse(body);

  if (!validatedFields.success) {
    return new Response("Invalid data", { status: 400 });
  }

  const { data } = validatedFields;

  // 4. Update user data
  const { updatedUser, error } = await updateUserById(userId, {
    ...data,
    updatedAt: new Date(),
  });

  if (updatedUser) {
    const token = await sign({ userId });
    //inform workspaces
    try {
      await fetch(
        `${env.BACKEND_DOMAIN}/parties/user/${userId}/update?token=${token}`,
        {
          method: "POST",
        },
      );
    } catch {}
    return Response.json({ success: true, user: updatedUser });
  }

  return new Response(error, { status: 400 });
}
