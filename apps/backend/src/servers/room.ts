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
      this.router = (await initializeRoom(this)).router;
    });
  }

  async onRequest(req: Request): Promise<Response> {
    if (req.headers.get("authorization") !== this.env.SECRET_KEY)
      return new Response(null, { status: 401 });
    return handleIngress(() => this.router.fetch(req, this.env));
  }
}
