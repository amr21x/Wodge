import type { FeatureFlagHandlers } from "../handlers/feature-flags";
import type { PokeMessage } from "@wodge/domain/sync/index";
import type {
  PresenceMap,
  ServerWorkspaceMembers,
  ServerWorkspaceStructure,
  Versions,
  WorkspacePartyInterface,
} from "@wodge/domain/sync/state";
import { Server } from "partyserver";
import { initializeWorkspace } from "../di/runtime";
import { handleIngress, handleStartup } from "../errors/handler";
import type { UserGateway } from "../gateways/user";

import { AuthorizationInvalidations } from "../lib/authorization/invalidation";
import { WorkspaceRoutes } from "../routes/workspace";
import type { WorkerEnvironment } from "../types/worker-environment";

export default class WorkspaceServer
  extends Server<WorkerEnvironment>
  implements WorkspacePartyInterface
{
  private features!: FeatureFlagHandlers;
  private router!: WorkspaceRoutes["router"];
  private invalidations!: AuthorizationInvalidations;

  static options = {
    hibernate: true,
  };

  // Hydrated by awaited onStart before the runtime dispatches requests.
  workspaceMembers!: ServerWorkspaceMembers;
  workspaceStructure!: ServerWorkspaceStructure;
  versions!: Versions;

  presenceMap!: PresenceMap;

  declare readonly ctx: DurableObjectState<{}>;
  declare readonly env: WorkerEnvironment;

  async onStart() {
    await handleStartup(async () => {
      const dependencies = await initializeWorkspace(this);
      this.features = dependencies.features;
      this.router = dependencies.routes.router;
      this.invalidations = dependencies.invalidations;
    });
  }

  async onRequest(req: Request): Promise<Response> {
    if (req.headers.get("authorization") !== this.env.SECRET_KEY)
      return new Response(null, { status: 401 });
    return handleIngress(async () => {
      const denied = await this.features.party(req, "workspace");
      return denied ?? this.router.fetch(req, this.env);
    });
  }

  // Retry unacknowledged invalidations independently of the request that created them.
  async onAlarm() {
    await this.invalidations.flush();
  }

  async poke(
    { type, id, userId, teamId }: WorkspacePokeProps = {
      type: "workspace",
    },
    gateway: UserGateway,
  ) {
    // Pokes tell connected clients to pull; authoritative records stay in their owning object.
    const recipients = userId ? [userId] : [...this.presenceMap.keys()];

    await Promise.all(
      recipients.map(async (recipient) => {
        return gateway.notify(recipient, {
          type,
          id: id || this.name,
          teamId,
        });
      }),
    );
  }
}

interface WorkspacePokeProps {
  type: PokeMessage["type"];
  id?: string;
  userId?: string;
  teamId?: string;
}
