import { Hono } from "hono";
import type { AccountHandlers } from "../../src/handlers/api/account";
import type { ApiContext } from "../../src/types/hono-context";

/** Compile-only contracts: Hono exposes request variables, never a service locator. */
export function verifyContextTypes(handlers: AccountHandlers) {
  const routes = new Hono<ApiContext>();
  routes.get("/account", handlers.currentAccount);
  routes.get("/identity", (c) => {
    const userId: string = c.get("user").id;
    const sessionId: string = c.get("sessionId");
    // @ts-expect-error handlers are constructor injected, not context variables
    c.get("handlers");
    // @ts-expect-error request context does not expose the container
    c.get("container");
    return c.json({ userId, sessionId });
  });
}
