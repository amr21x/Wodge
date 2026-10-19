import type { JoinPreviewDto } from "@wodge/domain/workspace/dto";
import { SafeAvatar } from "@/components/safe-avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cookies } from "next/headers";
import { env } from "@wodge/env/client";

import { AcceptButton } from "../../../../../features/workspace/components/accept-button";
import { redirect } from "next/navigation";

async function JoinWorkspacePage({
  params,
}: {
  params: { token: string; workspaceSlug: string };
}) {
  const response = await fetch(
    `${env.NEXT_PUBLIC_BACKEND_DOMAIN}/api/workspaces/preview/${encodeURIComponent(params.workspaceSlug)}/${encodeURIComponent(params.token)}`,
    {
      headers: { cookie: cookies().toString() },
      cache: "no-store",
    },
  );

  if (response.status === 401) {
    return redirect(
      `/login?redirect=${encodeURIComponent(`/${params.workspaceSlug}/join/${params.token}`)}`,
    );
  }

  if (!response.ok) {
    return <div>Unable to load invite</div>;
  }

  const { data, workspace, membership } =
    (await response.json()) as JoinPreviewDto;

  if (!data || !workspace) {
    return <div>Invalid invite</div>;
  }

  const { users: user, invites: invite } = data;

  if (!workspace || !workspace.isInviteLinkEnabled) {
    return <div>Invalid invite</div>;
  }

  if (workspace.id !== invite.workspaceId) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        Invalid invite
      </div>
    );
  }

  if (membership) {
    return redirect(`/${workspace.slug}`);
  }

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
