import { memberships } from "@wodge/data";
import { createDb, getUserInfoById } from "@/lib/data-server";
import { and, eq } from "drizzle-orm";

export async function GET(
  req: Request,
  { params }: { params: { workspaceId: string } },
) {
  // Check if workspace member
  const { workspaceId } = params;
  const userId = req.headers.get("x-user-id");

  if (!userId) return new Response(null, { status: 401 });

  const db = createDb();

  const workspace = await db.query.memberships.findFirst({
    where: and(
      eq(memberships.userId, userId),
      eq(memberships.workspaceId, workspaceId),
    ),
  });

  if (!workspace) return new Response(null, { status: 401 });

  // TODO: Optimize
  const membersIds = await db.query.memberships.findMany({
    where: eq(memberships.workspaceId, workspaceId),
    columns: {
      userId: true,
    },
  });

  const members = await getUserInfoById(
    membersIds.map((member) => member.userId),
  );

  if (members === null) return new Response(null, { status: 404 });

  return Response.json(members);
}
