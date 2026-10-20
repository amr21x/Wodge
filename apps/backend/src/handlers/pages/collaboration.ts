import { channelCapabilities } from "@wodge/auth/authorization/channel-capabilities";
import { AuthChannelResponseSchema } from "@wodge/domain/channels/index";
import { inject, injectable } from "tsyringe";
import { z } from "zod";
import { WorkspaceGateway } from "../../gateways/workspace";

const connectionScope = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  teamId: z.string().min(1),
  folderId: z.string().min(1),
});

@injectable()
export class PageCollaborationHandlers {
  constructor(
    @inject(WorkspaceGateway) private readonly workspace: WorkspaceGateway,
  ) {}

  /** Called only with the request authenticated and rewritten by Worker ingress. */
  connect(request: Request) {
    const url = new URL(request.url);
    return connectionScope.parse({
      userId: request.headers.get("x-user-id"),
      workspaceId:
        request.headers.get("x-workspace-id") ??
        url.searchParams.get("workspaceId"),
      teamId:
        request.headers.get("x-team-id") ?? url.searchParams.get("teamId"),
      folderId:
        request.headers.get("x-folder-id") ?? url.searchParams.get("folderId"),
    });
  }

  async access(state: unknown, pageId: string) {
    const scope = connectionScope.safeParse(state);
    if (!scope.success) return { canView: false, canEdit: false };
    const response = await this.workspace.channelAccess(
      scope.data.workspaceId,
      {
        ...scope.data,
        channelId: pageId,
        type: "page",
      },
    );
    if (!response.ok) throw new Error("Page authorization unavailable");
    return channelCapabilities(
      AuthChannelResponseSchema.parse(await response.json()),
    );
  }
}
