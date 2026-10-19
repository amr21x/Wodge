import { SessionTickets } from "@wodge/auth/tickets";
import { AccountService } from "@wodge/core/user/services/account";
import type { UserType } from "@wodge/domain/user/models";
import { Hono } from "hono";
import { hc } from "hono/client";
import { expect, test, vi } from "vitest";
import { createRuntimeContainer } from "../../src/container";
import { handleError } from "../../src/errors/handler";
import { UserGateway } from "../../src/gateways/user";
import { AccountRoutes } from "../../src/routes/api/accounts";
import type { ApiType } from "../../src/types/api-types";
import type { ApiContext } from "../../src/types/hono-context";
import { createTestEnvironment } from "../helpers/environment";

function fixture() {
  const environment = createTestEnvironment();
  const container = createRuntimeContainer(environment as never);
  const user: UserType = {
    id: "reader",
    email: "reader@example.test",
    username: "reader",
    displayName: "Reader",
    avatar: null,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
  const update = vi.fn(async () => ({ updatedUser: user }));
  const refreshProfile = vi.fn(async () => new Response(null, { status: 204 }));
  container.registerInstance(AccountService, { update } as never);
  container.registerInstance(SessionTickets, {} as never);
  container.registerInstance(UserGateway, { refreshProfile } as never);
  const routes = container.resolve(AccountRoutes);
  const app = new Hono<ApiContext>();
  app.onError(handleError);
  app.use("*", async (c, next) => {
    c.set("user", user);
    await next();
  });
  app.route("/api/users", routes.router);
  const resolve = vi.spyOn(container, "resolve");
  const client = hc<ApiType>("http://api.test", {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) =>
      app.fetch(new Request(input, init), environment as never),
  });
  return { app, client, container, update, refreshProfile, resolve };
}

test("the typed client calls an injected handler and receives the serialized profile", async () => {
  const f = fixture();
  try {
    const response = await f.client.api.users.me.$get();
    expect(response.status).toBe(200);
    const user = await response.json();
    expect(user.id).toBe("reader");
    expect(user.createdAt).toBe("1970-01-01T00:00:00.000Z");
    expect(f.resolve).not.toHaveBeenCalled();
  } finally {
    await f.container.dispose();
  }
});

test("typed JSON requests reach the handler as schema-parsed input", async () => {
  const f = fixture();
  try {
    const response = await f.client.api.users.update.$post({
      json: { username: "  reader  ", displayName: "Reader" },
    });
    expect(response.status).toBe(200);
    expect(f.update).toHaveBeenCalledWith("reader", {
      username: "reader",
      displayName: "Reader",
    });
    expect(f.refreshProfile).toHaveBeenCalledWith("reader");
    expect(f.resolve).not.toHaveBeenCalled();
  } finally {
    await f.container.dispose();
  }
});

test("invalid JSON is rejected before injected application dependencies are called", async () => {
  const f = fixture();
  try {
    const response = await f.app.request("/api/users/update", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "reader", displayName: 42 }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: { code: "VALIDATION_FAILED" },
    });
    expect(f.update).not.toHaveBeenCalled();
    expect(f.refreshProfile).not.toHaveBeenCalled();
  } finally {
    await f.container.dispose();
  }
});
