import { env } from "@wodge/env";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { sign } from "../../../../lib/utils/sign";

export async function POST(req: Request, res: NextResponse) {
  const userId = req.headers.get("x-user-id");

  // console.log(req.headers);

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const domain = req.headers.get("domain");
  const id = req.headers.get("id");

  if (!domain || !id) {
    return new Response("Bad Request", { status: 400 });
  }

  const token = await sign({ userId });

  return redirect(
    `${env.BACKEND_DOMAIN}/parties/${domain}/${id}/replicache-pull?token=${token}`,
  );
}
