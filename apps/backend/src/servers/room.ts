import { mutationRecordId } from "@wodge/core/features/policy";
import type { FeatureHandlers } from "../handlers/features";
import type {
  RoomPartyInterface,
  ServerRoomMessages,
  Versions,
} from "@wodge/domain/sync/state";
import { Server } from "partyserver";
import { initializeRoom } from "../di/runtime";
import { handleIngress, handleStartup } from "../errors/handler";
import { RoomRoutes } from "../routes/rooms";
import type { WorkerEnvironment } from "../types/worker-environment";

export default class RoomServer
  extends Server<WorkerEnvironment>
  implements RoomPartyInterface
{
  private features!: FeatureHandlers;
  private router!: RoomRoutes["router"];

  static options = {
    hibernate: true,
  };

  // Hydrated by awaited onStart before the runtime dispatches requests.
  messages!: ServerRoomMessages;
  versions!: Versions;

  declare readonly ctx: DurableObjectState<{}>;
  declare readonly env: WorkerEnvironment;

  async onStart() {
    await handleStartup(async () => {
      const dependencies = await initializeRoom(this);
      this.router = dependencies.routes.router;
      this.features = dependencies.features;
    });
  }

  async onRequest(req: Request): Promise<Response> {
    if (req.headers.get("authorization") !== this.env.SECRET_KEY)
      return new Response(null, { status: 401 });
    return handleIngress(async () => {
      const denied = await this.features.party(req, "room", (mutation) => {
        const id = mutationRecordId(mutation.args);
        return this.messages.data.find((record) => record.id === id)?.type;
      });
      return denied ?? this.router.fetch(req, this.env);
    });
  }
}
