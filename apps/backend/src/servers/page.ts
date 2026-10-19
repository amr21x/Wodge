import type { PageRecordRepository } from "@wodge/core/pages/repositories/records";
import type {
  PagePartyInterface,
  PageState,
  Versions,
} from "@wodge/domain/sync/state";
import type { Connection, ConnectionContext } from "partyserver";
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

  onConnect(connection: Connection, context: ConnectionContext) {
    connection.setState({
      canEdit: context.request.headers.get("x-can-edit") === "true",
    });

    return super.onConnect(connection, context);
  }

  // Enforce read-only access on Yjs updates as well as on ordinary HTTP mutations.
  isReadOnly(connection: Connection<{ canEdit?: boolean }>) {
    return connection.state?.canEdit !== true;
  }

  async onRequest(request: Request): Promise<Response> {
    if (request.headers.get("authorization") !== this.env.SECRET_KEY)
      return new Response(null, { status: 401 });
    return handleIngress(() => this.router.fetch(request, this.env));
  }
}
