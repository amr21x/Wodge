import type { ChannelsTypes } from "@wodge/domain/channels/index";
import { HttpClient } from "@wodge/infra/http/client";
import { getServerByName } from "partyserver";
import { inject, injectable } from "tsyringe";
import type { WorkerEnvironment } from "../types/worker-environment";

/** The namespace binding selects the object; the stub URL hostname does not use DNS. */
@injectable()
export class WorkspaceGateway {
  constructor(
    @inject(HttpClient) private readonly http: HttpClient,
    @inject("environment") private readonly bindings: WorkerEnvironment,
  ) {}

  async synchronizeOrganization(organizationId: string, deleted = false) {
    const response = await this.request(
      organizationId,
      "/service/organization-sync",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ deleted }),
      },
    );
    if (!response.ok) {
      throw new Error("Workspace projection synchronization failed");
    }
  }

  async refreshMetadata(workspaceId: string) {
    const response = await this.request(
      workspaceId,
      "/service/metadata-update",
      { method: "POST" },
    );
    if (!response.ok) throw new Error("Workspace metadata notification failed");
  }

  notify(workspaceId: string) {
    return this.request(workspaceId, "/service/poke", { method: "POST" });
  }

  notifyChannel(workspaceId: string, channelId: string) {
    return this.request(workspaceId, "/service/poke-channel", {
      method: "POST",
      headers: { channelId },
    });
  }

  refreshMemberProfiles(workspaceId: string) {
    return this.request(workspaceId, "/service/member-update", {
      method: "POST",
    });
  }

  channelAccess(
    workspaceId: string,
    scope: {
      teamId: string;
      userId: string;
      channelId: string;
      type: ChannelsTypes;
      folderId?: string | null;
    },
  ) {
    return this.request(workspaceId, "/service/auth-channel", {
      headers: {
        "x-workspace-id": workspaceId,
        "x-team-id": scope.teamId,
        "x-user-id": scope.userId,
        "x-channel-id": scope.channelId,
        "x-channel-type": scope.type,
        ...(scope.folderId && { "x-folder-id": scope.folderId }),
      },
    });
  }

  async setPresence(workspaceId: string, userId: string, connect: boolean) {
    const response = await this.request(workspaceId, "/service/presence", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, connect }),
    });
    if (!response.ok) {
      throw new Error("Workspace presence update failed");
    }
  }

  private async request(workspaceId: string, path: string, init: RequestInit) {
    const workspace = await getServerByName(
      this.bindings.Workspace,
      workspaceId,
    );
    const headers = new Headers(init.headers);
    headers.set("authorization", this.bindings.SECRET_KEY);
    return this.http.request(
      new Request(
        `https://internal/parties/workspace/${encodeURIComponent(workspaceId)}${path}`,
        { ...init, headers },
      ),
      undefined,
      (request) => workspace.fetch(request),
    );
  }
}
