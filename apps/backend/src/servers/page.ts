import type { PageCollaborationHandlers } from "../handlers/pages/collaboration";
import { gatePageConnection } from "../lib/feature-connection";
import type { FeatureFlagHandlers } from "../handlers/feature-flags";
import type { PageDocumentRepository } from "@wodge/core/pages/repositories/document";
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
  private features!: FeatureFlagHandlers;
  private router!: PageRoutes["router"];
  private persistence!: PageDocumentRepository;
  private collaboration!: PageCollaborationHandlers;
  private pendingUpdates: Uint8Array[] = [];
  private documentSequence = 0;
  private snapshotSequence = 0;
  private pendingBytes = 0;

  declare readonly ctx: DurableObjectState<{}>;
  declare readonly env: WorkerEnvironment;
  // Hydrated by awaited onStart before the runtime dispatches requests.
  state!: PageState;
  versions!: Versions;

  async onStart() {
    await handleStartup(async () => {
      const dependencies = await initializePage(this);
      this.collaboration = dependencies.collaboration;
      this.features = dependencies.features;
      this.persistence = dependencies.document;
      this.router = dependencies.routes.router;
      await super.onStart();
      this.document.on("update", (update: Uint8Array) => {
        this.pendingUpdates.push(update);
        this.flushUpdates();
      });
    });
  }

  // Restore Yjs state before serving collaboration connections.
  async onLoad() {
    const saved = await this.persistence.loadDocument();
    if (saved.snapshot) Y.applyUpdate(this.document, saved.snapshot);
    for (const update of saved.updates) Y.applyUpdate(this.document, update);
    this.documentSequence = saved.sequence;
    this.snapshotSequence = saved.snapshot_sequence;
    this.pendingBytes = saved.updates.reduce(
      (bytes, update) => bytes + update.byteLength,
      0,
    );
  }

  private flushUpdates() {
    if (!this.pendingUpdates.length) return;
    this.documentSequence = this.persistence.appendUpdates(this.pendingUpdates);
    this.pendingBytes += this.pendingUpdates.reduce(
      (bytes, update) => bytes + update.byteLength,
      0,
    );
    this.pendingUpdates = [];
  }

  async onSave() {
    this.flushUpdates();
    if (this.documentSequence === this.snapshotSequence) return;
    this.snapshotSequence = this.persistence.compact(
      Y.encodeStateAsUpdate(this.document),
      this.documentSequence,
    );
    this.pendingBytes = 0;
  }

  private async canSend(connection: Connection) {
    return (
      (await this.refreshAccess(connection)) && this.pendingUpdates.length === 0
    );
  }

  private pagesEnabled = async () => !(await this.features.check(["pages"]));

  *getConnections<TState = unknown>(
    tag?: string,
  ): Iterable<Connection<TState>> {
    for (const connection of super.getConnections<TState>(tag)) {
      yield gatePageConnection(connection, () => this.canSend(connection));
    }
  }

  private async refreshAccess(connection: Connection) {
    try {
      if (!(await this.pagesEnabled())) return false;
      const access = await this.collaboration.access(
        connection.state,
        this.name,
      );
      if (!access.canView) {
        connection.close(1008, "Page access revoked");
        return false;
      }
      connection.setState((previous: object | null) => ({
        ...previous,
        canEdit: access.canEdit,
      }));
      return true;
    } catch {
      connection.close(1011, "Page authorization unavailable");
      return false;
    }
  }

  async onMessage(connection: Connection, message: WSMessage) {
    if (await this.refreshAccess(connection)) {
      try {
        this.flushUpdates();
        super.onMessage(
          gatePageConnection(connection, () => this.canSend(connection)),
          message,
        );
        // Yjs can catch observer errors, so also check for an uncommitted update after dispatch.
        if (this.pendingUpdates.length)
          throw new Error("Page update was not persisted");
      } catch (error) {
        for (const client of super.getConnections())
          client.close(1011, "Page persistence unavailable");
        throw error;
      }
      // Bound recovery work even when continuous editing postpones the debounce save.
      if (
        this.documentSequence - this.snapshotSequence >= 64 ||
        this.pendingBytes >= 256 * 1024
      ) {
        await this.onSave();
      }
    }
  }

  async onConnect(connection: Connection, context: ConnectionContext) {
    if (context.request.headers.get("authorization") !== this.env.SECRET_KEY) {
      connection.close(1008, "Unauthorized");
      return;
    }
    connection.setState(this.collaboration.connect(context.request));
    if (await this.refreshAccess(connection)) {
      return super.onConnect(
        gatePageConnection(connection, () => this.canSend(connection)),
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
