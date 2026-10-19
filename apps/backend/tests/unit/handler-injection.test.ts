import { SessionTickets } from "@wodge/auth/tickets";
import { AccountService } from "@wodge/core/user/services/account";
import { Hono } from "hono";
import { expect, test, vi } from "vitest";
import { createRuntimeContainer } from "../../src/container";
import { UserGateway } from "../../src/gateways/user";
import { AccountHandlers } from "../../src/handlers/api/account";
import { AccountRoutes } from "../../src/routes/api/accounts";
import type { ApiContext } from "../../src/types/hono-context";
import { createTestEnvironment } from "../helpers/environment";

test("routes bind injected handler methods once and keep identity local to each request", async () => {
  const environment = createTestEnvironment();
  const container = createRuntimeContainer(environment as never);
  container.registerInstance(AccountService, {} as never);
  container.registerInstance(SessionTickets, {} as never);
  container.registerInstance(UserGateway, {} as never);
  const handlers = container.resolve(AccountHandlers);
  const routes = container.resolve(AccountRoutes);
  const app = new Hono<ApiContext>();
  app.use("*", async (c, next) => {
    c.set("user", { id: c.req.header("x-user-id")! } as never);
    await next();
  });
  app.route("/", routes.router);
  const resolve = vi.spyOn(container, "resolve");
  try {
    const responses = await Promise.all(
      ["alice", "bob"].map((id) =>
        app.request(
          "/me",
          { headers: { "x-user-id": id } },
          environment as never,
        ),
      ),
    );
    expect(await Promise.all(responses.map((r) => r.json()))).toEqual([
      { id: "alice" },
      { id: "bob" },
    ]);
    expect(resolve).not.toHaveBeenCalled();
    expect(handlers.currentAccount).toBe(handlers.currentAccount);
  } finally {
    await container.dispose();
  }
});
