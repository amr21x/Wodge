import { invites, workspaces } from "@wodge/data";
import { createDb } from "@/lib/data-server";
import { env } from "@wodge/env";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { isWorkspaceAdmin } from "../../is-workspace-admin";

export async function POST(
  req: NextRequest,
  {
    params: { workspaceId },
  }: { params: { workspaceId: string; token: string } },
) {
  const db = createDb();

  const userId = req.headers.get("x-user-id");

  if (!userId) return new Response(null, { status: 401 });

  if (!(await isWorkspaceAdmin(userId, workspaceId)))
    return new Response(null, { status: 401 });

  try {
    const token = nanoid(8);

    const invite = await db
      .update(invites)
      .set({ token, createdBy: userId })
      .where(eq(invites.workspaceId, workspaceId))
      .returning()
      .get();

    return Response.json(invite, { status: 200 });
  } catch (e) {
    console.log(e);
    return new Response(null, { status: 400 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params: { workspaceId } }: { params: { workspaceId: string } },
) {
  const db = createDb();

  const userId = req.headers.get("x-user-id");

  if (!userId) {
    return new Response(null, { status: 401 });
  }

  if (!(await isWorkspaceAdmin(userId, workspaceId)))
    return new Response(null, { status: 401 });

  try {
    await db.run(
      sql`UPDATE ${workspaces} SET is_invite_link_enabled = 1 - is_invite_link_enabled WHERE id = ${workspaceId}`,
    );

    return new Response(null, { status: 200 });
  } catch (e) {
    return new Response(null, { status: 400 });
  }
}

export async function GET(
  req: NextRequest,
  { params: { workspaceId } }: { params: { workspaceId: string } },
) {
  const db = createDb();

  const userId = req.headers.get("x-user-id");

  if (!userId) return new Response(null, { status: 401 });

  if (!(await isWorkspaceAdmin(userId, workspaceId)))
    return new Response(null, { status: 401 });

  try {
    const invitesData = await db
      .select()
      .from(invites)
      .where(eq(invites.workspaceId, workspaceId));

    return Response.json({ invites: invitesData }, { status: 200 });
  } catch (e) {
    console.log(e);
    return new Response(null, { status: 400 });
  }
}
