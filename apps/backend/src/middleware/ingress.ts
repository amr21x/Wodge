import type { AuthInstance } from "@wodge/auth/server";
import { SessionTickets } from "@wodge/auth/tickets";
import { AccountService } from "@wodge/core/user/services/account";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { WorkspaceGateway } from "../gateways/workspace";
import type { ApiContext } from "../types/hono-context";
import { authorizeChannel } from "./auth";

const trustedHeaders = [
  "x-user-id",
  "x-session-id",
  "x-username",
  "channel-auth",
  "x-admin",
  "x-owner",
  "x-team-moderator",
  "x-can-edit",
  "x-can-view",
];

const namespaces = new Set(["user", "workspace", "room", "thread", "page"]);

export function partyIngress(
  auth: AuthInstance,
  tickets: SessionTickets,
  gateway: WorkspaceGateway,
  accounts: AccountService,
): MiddlewareHandler<ApiContext> {
  return async (c, next) => {
    // The public object path is /parties/:namespace/:id followed by an optional operation.
    const [, , namespace, encodedId, ...segments] = new URL(
      c.req.url,
    ).pathname.split("/");

    if (!namespace || !namespaces.has(namespace) || !encodedId) {
      return c.notFound();
    }

    let id: string;
    try {
      id = decodeURIComponent(encodedId);
    } catch {
      throw new HTTPException(400, { message: "Invalid object identifier" });
    }
    if (!id || id.length > 256 || /[\/\\\u0000-\u001f\u007f]/.test(id))
      throw new HTTPException(400, { message: "Invalid object identifier" });
    const path = "/" + segments.join("/");

    // Service endpoints are reachable through bound DO stubs, never the public Worker ingress.
    if (path.startsWith("/service")) {
      return c.json({ error: "Forbidden" }, 403);
    }

    let userId: string | undefined;
    let sessionId: string | undefined;
    let upload = false;
    let sessionUsername: string | null | undefined;
    const url = new URL(c.req.url);
    const token = url.searchParams.get("token");

    if (token) {
      try {
        const payload = await tickets.verify(token);

        if (!payload) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        userId = payload.userId;
        sessionId = payload.sessionId;
        upload = payload.purpose === "upload";
      } catch {
        return c.json({ error: "Unauthorized" }, 401);
      }
    } else {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });

      userId = session?.user.id;
      sessionId = session?.session.id;
      sessionUsername = session?.user.username;
    }

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    if (upload && (namespace !== "workspace" || !path.startsWith("/file"))) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (namespace === "user" && id !== userId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    if (
      namespace === "workspace" &&
      c.req.header("upgrade")?.toLowerCase() === "websocket"
    ) {
      return c.json({ error: "Not implemented" }, 501);
    }

    const request = new Request(c.req.raw);

    // Only verified session/ticket data and server-computed permissions may reach an object.
    for (const header of trustedHeaders) {
      request.headers.delete(header);
    }

    request.headers.set("x-user-id", userId);
    if (sessionId) {
      request.headers.set("x-session-id", sessionId);
    }

    if (namespace === "thread" || namespace === "page") {
      if (
        upload ||
        !(await authorizeChannel(request, gateway, userId, namespace, id))
      ) {
        return c.json({ error: "Forbidden" }, 403);
      }
    }

    // Cookie authentication already returned the user. Tickets carry only identity claims.
    const username = token
      ? (await accounts.getUserById(userId))?.username
      : sessionUsername;
    if (username) {
      request.headers.set("x-username", username);
    }

    request.headers.set("authorization", c.env.SECRET_KEY);
    c.req.raw = request;

    await next();
  };
}
