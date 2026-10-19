import type { PokeMessage } from "@wodge/domain/sync/index";
import { inject, injectable } from "tsyringe";
import type WorkspaceServer from "../servers/workspace";
import { UserGateway } from "./user";

/** Publish workspace changes through the current object's connected clients. */
@injectable()
export class WorkspaceNotifications {
  constructor(
    @inject("workspace") private readonly workspace: WorkspaceServer,
    @inject(UserGateway) private readonly users: UserGateway,
  ) {}

  readonly notify = (message?: PokeMessage) => {
    return this.workspace.poke(message, this.users);
  };
}
