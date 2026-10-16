import type * as Party from "partykit/server";
import { getRoute, notImplemented, ok, unauthorized } from "../lib/http-utils";

import { verifyToken } from "../lib/auth";

import {
  ServerWorkspaceMembers,
  WorkspacePartyInterface,
  ServerWorkspaceStructure,
  Versions,
  PresenceMap,
} from "../types";

import { Invites, PokeMessage } from "@wodge/data";
import { Hono } from "hono";
import { startFn } from "./start-fn";
import { cors } from "hono/cors";

import { setupUsersRoutes } from "./routes/users-routes";
import { setupMembershipsRoutes } from "./routes/memberships-routes";
import { setupServiceRoutes } from "./routes/service-routes";
import { setupAdministrativeRoutes } from "./routes/administrative-routes";

export default class WorkspaceParty
  implements Party.Server, WorkspacePartyInterface
{
  options: Party.ServerOptions = {
    hibernate: true,
  };

  workspaceMembers: ServerWorkspaceMembers;
  // workspaceMetadata: ServerWorkspaceData;
  workspaceStructure: ServerWorkspaceStructure;
  versions: Versions;

  // Map to track the presence of users in the workspace
  // Number count the connected user devices - may use the user-agent header instead
  presenceMap: PresenceMap;

  app: Hono = new Hono().basePath("/parties/workspace/:workspaceId");

  constructor(readonly room: Party.Room) {}

  async onStart() {
    this.app.use(
      cors({
        origin: "*",
        allowHeaders: ["x-file-path", "x-user-id"],
      })
    );

    // Authenticated users routes from the edge
    setupUsersRoutes(this);

    // Setup memberships routes
    setupMembershipsRoutes(this);

    // Service routes
    setupServiceRoutes(this);

    // Administrative routes
    setupAdministrativeRoutes(this);

    await startFn(this);
  }

  async onRequest(req: Party.Request) {
    const route = getRoute(req);

    const userId = req.headers.get("x-user-id");

    if (
      route !== "/create" &&
      route !== "/join" &&
      !route.startsWith("/service") &&
      !this.workspaceMembers.data.members.some((member) => member.id === userId)
    ) {
      return unauthorized();
    }

    // @ts-ignore
    return this.app.fetch(req);
  }

  static async onBeforeConnect(req: Party.Request, lobby: Party.Lobby) {
    return notImplemented();
  }

  static async onBeforeRequest(req: Party.Request, lobby: Party.Lobby) {
    // if (lobby.id.length !== ID_LENGTH) return notFound();

    // CORS preflight response
    if (req.method === "OPTIONS") {
      return ok();
    }
    const route = getRoute(req);

    if (route === "/service/poke") {
      const secretKey = req.headers.get("authorization");

      if (secretKey === lobby.env.SECRET_KEY) {
        return req;
      } else {
        return unauthorized();
      }
    }
    const payload = await verifyToken(req, lobby);

    if (!payload || !payload?.userId) {
      return unauthorized();
    }

    if (payload?.isUpload && !route.startsWith("/file")) {
      return unauthorized();
    }

    req.headers.set("x-user-id", payload.userId as string);

    return req;
  }

  async poke(
    { type, id, userId, teamId }: WorkspacePokeProps = {
      type: "workspace",
    }
  ) {
    const userParty = this.room.context.parties.user!;

    if (userId) {
      return await userParty.get(userId).fetch("/service/poke", {
        method: "POST",
        headers: {
          authorization: this.room.env.SECRET_KEY as string,
        },
        body: JSON.stringify({
          type,
          id: id || this.room.id,
          teamId,
        }),
      });
    }

    await Promise.all(
      Object.keys(Object.fromEntries(this.presenceMap)).map((userId) => {
        return userParty.get(userId).fetch("/service/poke", {
          method: "POST",
          headers: {
            authorization: this.room.env.SECRET_KEY as string,
          },
          body: JSON.stringify({
            type,
            id: id || this.room.id,
            teamId,
          }),
        });
      })
    );
  }
}
WorkspaceParty satisfies Party.Worker;

interface WorkspacePokeProps {
  type: PokeMessage["type"];
  id?: string;
  userId?: string;
  teamId?: string;
}
