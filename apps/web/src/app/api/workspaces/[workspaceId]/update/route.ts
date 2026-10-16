import { sign } from "@/lib/utils/sign";
import { Workspace, WorkspaceSchema } from "@wodge/data";
import { updateWorkspaceById } from "@/lib/data-server";
import { env } from "@wodge/env";
import { isWorkspaceAdmin } from "../../is-workspace-admin";

export async function POST(
  req: Request,
  { params: { workspaceId } }: { params: { workspaceId: string } },
) {
  const userId = req.headers.get("x-user-id");

  if (!userId) return new Response(null, { status: 401 });

  const token = await sign({ userId });

  if (!(await isWorkspaceAdmin(userId, workspaceId)))
    return new Response(null, { status: 401 });

  const body = await req.json();

  const validatedFields = WorkspaceSchema.pick({
    name: true,
    slug: true,
  })
    .strict()
    .safeParse(body);

  if (!validatedFields.success) {
    return new Response(null, { status: 400 });
  }

  const { data: workspace } = validatedFields;

  await updateWorkspaceById(workspaceId, workspace);

  const res = await fetch(
    `${env.BACKEND_DOMAIN}/parties/workspace/${workspaceId}/update?token=${token}`,
    { method: "POST" },
  );

  if (!res.ok) return new Response(null, { status: 500 });

  return new Response(null, { status: 200 });
}
