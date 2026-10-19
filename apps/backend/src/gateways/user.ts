import type { PokeMessage } from "@wodge/domain/sync/index";
import { HttpClient } from "@wodge/infra/http/client";
import { getServerByName } from "partyserver";
import { inject, injectable } from "tsyringe";
import type { WorkerEnvironment } from "../types/worker-environment";

/** Client for per-user Durable Object operations; the user ID selects the target object. */
@injectable()
export class UserGateway {
  constructor(
    @inject(HttpClient) private readonly http: HttpClient,
    @inject("environment") private readonly bindings: WorkerEnvironment,
  ) {}

  addWorkspace(userId: string, workspaceId: string) {
    return this.request(userId, "/service/add-workspace", {
      method: "POST",
      headers: { workspaceId },
    });
  }

  removeWorkspace(userId: string, workspaceId: string) {
    return this.request(userId, "/service/remove-workspace", {
      method: "POST",
      body: JSON.stringify({ workspaceId }),
    });
  }

  notify(userId: string, message: PokeMessage) {
    return this.request(userId, "/service/poke", {
      method: "POST",
      body: JSON.stringify(message),
    });
  }

  refreshProfile(userId: string) {
    return this.request(userId, "/update", {
      method: "POST",
      headers: { "x-user-id": userId },
    });
  }

  private async request(userId: string, operation: string, init: RequestInit) {
    const user = await getServerByName(this.bindings.User, userId);
    const headers = new Headers(init.headers);
    headers.set("authorization", this.bindings.SECRET_KEY);
    return this.http.request(
      `https://internal/parties/user/${encodeURIComponent(userId)}${operation}`,
      { ...init, headers },
      (request) => user.fetch(request),
    );
  }
}
