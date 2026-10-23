import { mutationRecordId } from "@wodge/core/features/policy";
import type { FeatureFlagHandlers } from "../handlers/feature-flags";
import type {
  ServerThreadMessages,
  ThreadPartyInterface,
  Versions,
} from "@wodge/domain/sync/state";
import { Server } from "partyserver";
import { initializeThread } from "../di/runtime";
import { handleIngress, handleStartup } from "../errors/handler";
import { DiscussionRoutes } from "../routes/discussions";
import type { WorkerEnvironment } from "../types/worker-environment";

export default class ThreadServer
  extends Server<WorkerEnvironment>
  implements ThreadPartyInterface
{
  private features!: FeatureFlagHandlers;
  private router!: DiscussionRoutes["router"];

  static options = {
    hibernate: true,
  };

  // Hydrated by awaited onStart before the runtime dispatches requests.
  threadPosts!: ServerThreadMessages;
  versions!: Versions;

  declare readonly ctx: DurableObjectState<{}>;
  declare readonly env: WorkerEnvironment;

  async onStart() {
    await handleStartup(async () => {
      const dependencies = await initializeThread(this);
      this.router = dependencies.routes.router;
      this.features = dependencies.features;
    });
  }

  async onRequest(req: Request): Promise<Response> {
    if (req.headers.get("authorization") !== this.env.SECRET_KEY)
      return new Response(null, { status: 401 });
    return handleIngress(async () => {
      const denied = await this.features.party(req, "thread", (mutation) => {
        const id = mutationRecordId(mutation.args);
        return this.threadPosts.data.find((record) => record.id === id)?.type;
      });
      return denied ?? this.router.fetch(req, this.env);
    });
  }
}
