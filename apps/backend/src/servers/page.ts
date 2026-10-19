import { gatePageConnection } from "../lib/feature-connection";
import type { FeatureHandlers } from "../handlers/features";
import type { PageRecordRepository } from "@wodge/core/pages/repositories/records";
import type {
  PagePartyInterface,
  PageState,
  Versions,
} from "@wodge/domain/sync/state";
import type { Connection, ConnectionContext, WSMessage } from "partyserver";
import { YServer } from "y-partyserver";
import * as Y from "yjs";
import { initializePage } from "../di/runtime";
import { handleIngress, handleStartup } from "../errors/handler";
import { PageRoutes } from "../routes/pages";
import type { WorkerEnvironment } from "../types/worker-environment";

export default class PageServer
  extends YServer<WorkerEnvironment>
  implements PagePartyInterface
{
  private features!: FeatureHandlers;
  private router!: PageRoutes["router"];
  private persistence!: PageRecordRepository;

  declare readonly ctx: DurableObjectState<{}>;
  declare readonly env: WorkerEnvironment;
  // Hydrated by awaited onStart before the runtime dispatches requests.
  state!: PageState;
  versions!: Versions;

  async onStart() {
    await handleStartup(async () => {
      const dependencies = await initializePage(this);
      this.features = dependencies.features;
      this.persistence = dependencies.records;
      this.router = dependencies.routes.router;
      await super.onStart();
    });
  }

  // Restore Yjs state before serving collaboration connections.
  async onLoad() {
    const snapshot = await this.persistence.loadPageSnapshot();

    if (snapshot) {
      Y.applyUpdate(this.document, snapshot);
    }
  }

  async onSave() {
    await this.persistence.savePageSnapshot(
      Y.encodeStateAsUpdate(this.document),
    );
  }

  private pagesEnabled = async () => !(await this.features.check(["pages"]));

  *getConnections<TState = unknown>(
    tag?: string,
  ): Iterable<Connection<TState>> {
    for (const connection of super.getConnections<TState>(tag)) {
      yield gatePageConnection(connection, this.pagesEnabled);
    }
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (await this.pagesEnabled()) {
      super.onMessage(
        gatePageConnection(connection, this.pagesEnabled),
        message,
      );
    }
  }

  async onConnect(connection: Connection, context: ConnectionContext) {
    connection.setState({
      canEdit: context.request.headers.get("x-can-edit") === "true",
    });

    if (await this.pagesEnabled()) {
      return super.onConnect(
        gatePageConnection(connection, this.pagesEnabled),
        context,
      );
    }
  }

  // Enforce read-only access on Yjs updates as well as on ordinary HTTP mutations.
  isReadOnly(connection: Connection<{ canEdit?: boolean }>) {
    return connection.state?.canEdit !== true;
  }

  async onRequest(request: Request): Promise<Response> {
    if (request.headers.get("authorization") !== this.env.SECRET_KEY)
      return new Response(null, { status: 401 });
    return handleIngress(async () => {
      const denied = await this.features.party(request, "page");
      return denied ?? this.router.fetch(request, this.env);
    });
  }
}
