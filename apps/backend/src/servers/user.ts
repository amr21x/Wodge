import type { FeatureFlagHandlers } from "../handlers/feature-flags";
import type { PokeMessage } from "@wodge/domain/sync/index";
import type { UserPartyInterface, Versions } from "@wodge/domain/sync/state";
import { Server, type Connection, type ConnectionContext } from "partyserver";
import { initializeUser } from "../di/runtime";
import { handleIngress, handleStartup } from "../errors/handler";
import { WorkspaceGateway } from "../gateways/workspace";
import { UserRoutes } from "../routes/user";
import type { WorkerEnvironment } from "../types/worker-environment";

export default class UserServer
  extends Server<WorkerEnvironment>
  implements UserPartyInterface
{
  private features!: FeatureFlagHandlers;
  private router!: UserRoutes["router"];
  private workspaceGateway!: WorkspaceGateway;

  static options = {
    hibernate: true,
  };

  // Hydrated by awaited onStart before the runtime dispatches requests.
  workspacesStore!: Set<string>;
  versions!: Versions;

  declare readonly ctx: DurableObjectState<{}>;
  declare readonly env: WorkerEnvironment;

  async onStart() {
    await handleStartup(async () => {
      const dependencies = await initializeUser(this);
      this.features = dependencies.features;
      this.router = dependencies.routes.router;
      this.workspaceGateway = dependencies.workspaceGateway;
    });
  }

  async onConnect(connection: Connection, _ctx: ConnectionContext) {
    await this.ensurePresence();
    connection.send(
      JSON.stringify({
        type: "welcome",
        msg: "Welcome to the party!",
      }),
    );
  }

  async onClose() {
    const connections = [...this.getConnections()].length;

    if (connections === 0) {
      await this.handlePresence([...this.workspacesStore], false);
    }
  }

  async ensurePresence() {
    const connections = [...this.getConnections()].length;

    if (connections > 1) {
      return;
    }

    await this.handlePresence([...this.workspacesStore]);
  }

  async handlePresence(wid: string | string[], connecting = true) {
    const ids = typeof wid === "string" ? [wid] : wid;
    await Promise.all(
      ids.map((id) =>
        this.workspaceGateway.setPresence(id, this.name, connecting),
      ),
    );
  }

  async onRequest(req: Request): Promise<Response> {
    if (req.headers.get("authorization") !== this.env.SECRET_KEY)
      return new Response(null, { status: 401 });
    return handleIngress(async () => {
      const denied = await this.features.party(req, "user");
      return denied ?? this.router.fetch(req, this.env);
    });
  }

  poke(data?: PokeMessage) {
    this.broadcast(JSON.stringify({ sub: "poke", ...data }));
  }
}
