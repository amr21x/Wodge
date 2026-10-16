import { SafeAvatar } from "@/components/safe-avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { invites, memberships, users, workspaces } from "@wodge/data";
import { createDb } from "@/lib/data-server";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { AcceptButton } from "./accept-button";
import { redirect } from "next/navigation";

async function JoinWorkspacePage({
  params,
}: {
  params: { token: string; workspaceSlug: string };
}) {
  const db = createDb();

  const supabase = createClient();
  const userSession = await supabase.auth.getUser();

  if (!userSession || !userSession?.data.user?.id)
    return redirect(
      `/login?redirect=/${params.workspaceSlug}/join/${params.token}`,
    );

  const [invitesArr, workspacesArr, membershipsArr] = await db.batch([
    db
      .select()
      .from(invites)
      .innerJoin(users, eq(users.id, invites.createdBy))
      .where(eq(invites.token, params.token)),
    db.select().from(workspaces).where(eq(workspaces.id, params.workspaceSlug)),
    db
      .select()
      .from(memberships)
      .where(
        and(
          eq(memberships.workspaceId, params.workspaceSlug),
          eq(memberships.userId, userSession?.data.user?.id),
        ),
      ),
  ]);

  const [data] = invitesArr;
  const [workspace] = workspacesArr;
  const [membership] = membershipsArr;

  if (!data || !workspace) return <div>Invalid invite</div>;

  const { users: user, invites: invite } = data;

  if (!workspace || !workspace.isInviteLinkEnabled)
    return <div>Invalid invite</div>;

  if (workspace.id !== invite.workspaceId)
    return (
      <div className="flex h-full w-full items-center justify-center">
        Invalid invite
      </div>
    );

  if (membership) return redirect(`/${workspace.slug}`);

  return (
    <div className="flex h-full w-full items-center justify-center">
      <Card className="w-fit max-w-sm bg-dim">
        <CardHeader className="items-center">
          <SafeAvatar
            className="size-14 rounded-md"
            fallbackClassName="rounded-md"
            src={workspace?.avatar}
            fallback={workspace.name}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-balance text-center text-2xl">
            {user.displayName} has invited you to join {workspace.name}
          </p>

          <p className=" text-center">
            You are invited to join Wodge workspace{" "}
            <strong>{workspace.name}</strong>.
          </p>
        </CardContent>

        <CardFooter>
          <AcceptButton slug={workspace.slug} />
        </CardFooter>
      </Card>
    </div>
  );
}

export default JoinWorkspacePage;
