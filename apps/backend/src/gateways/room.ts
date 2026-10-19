import { HttpClient } from "@wodge/infra/http/client";
import { getServerByName } from "partyserver";
import { inject, injectable } from "tsyringe";
import type { WorkerEnvironment } from "../types/worker-environment";

@injectable()
export class RoomGateway {
  constructor(
    @inject(HttpClient) private readonly http: HttpClient,
    @inject("environment") private readonly environment: WorkerEnvironment,
    @inject("objectId") private readonly workspaceId: string,
  ) {}

  async bindRoom(roomId: string, teamId: string) {
    const room = await getServerByName(this.environment.Room, roomId);
    const response = await this.http.request(
      `https://internal/parties/room/${encodeURIComponent(roomId)}/service/bind-scope`,
      {
        method: "POST",
        headers: {
          authorization: this.environment.SECRET_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({ workspaceId: this.workspaceId, teamId, roomId }),
      },
      (request) => room.fetch(request),
    );
    if (!response.ok) {
      throw new Error("Room scope binding failed");
    }
  }

  async invalidateAuthorization(roomId: string, revision: number) {
    const room = await getServerByName(this.environment.Room, roomId);
    const response = await this.http.request(
      `https://internal/parties/room/${encodeURIComponent(roomId)}/service/authorization/invalidate`,
      {
        method: "POST",
        headers: {
          authorization: this.environment.SECRET_KEY,
          "content-type": "application/json",
        },
        body: JSON.stringify({ workspaceId: this.workspaceId, revision }),
      },
      (request) => room.fetch(request),
    );
    if (!response.ok) throw new Error("Room invalidation failed");
  }
}
