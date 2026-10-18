import type { AuthInstance } from "@wodge/auth/server";
import { Hono } from "hono";
import { expect, test, vi } from "vitest";
import { createRuntimeContainer } from "../../src/container";
import { authenticated } from "../../src/middleware/api";
import type { ApiContext } from "../../src/types/hono-context";
import type { WorkerEnvironment } from "../../src/types/worker-environment";

const user = {
  id: "canonical-user",
  name: "Member",
  email: "member@example.test",
  image: null,
  username: "member",
  emailVerified: true,
  createdAt: new Date(1700000000000),
  updatedAt: new Date(1700000000000),
};

function fixture(
  result: { user: typeof user; session: { id: string } } | null,
) {
  const scope = createRuntimeContainer({} as WorkerEnvironment);
  const getSession = vi.fn(async (_request: { headers: Headers }) => result);
  // Only the auth API method consumed by this middleware is supplied by the test.
  scope.registerInstance("auth", {
    api: { getSession },
  } as unknown as AuthInstance);
  const resolve = vi.spyOn(scope, "resolve");
  const app = new Hono<ApiContext>();
  app.use("*", authenticated(scope.resolve<AuthInstance>("auth")));
  app.get("/", (c) =>
    c.json({ user: c.get("user"), sessionId: c.get("sessionId") }),
  );
  return { app, scope, resolve, getSession };
}

test("authentication uses the canonical user returned by getSession without resolving a profile repository or service", async () => {
  const { app, scope, resolve, getSession } = fixture({
    user,
    session: { id: "session" },
  });
  try {
    const response = await app.request("/", {
      headers: { cookie: "session-cookie" },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.name,
        avatar: null,
        username: user.username,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      sessionId: "session",
    });
    expect(getSession).toHaveBeenCalledOnce();
    expect(getSession.mock.calls[0]?.[0].headers.get("cookie")).toBe(
      "session-cookie",
    );
    expect(resolve.mock.calls).toEqual([["auth"]]);
  } finally {
    await scope.dispose();
  }
});

test("an invalid session returns before loading or provisioning application data", async () => {
  const { app, scope, resolve } = fixture(null);
  try {
    expect((await app.request("/")).status).toBe(401);
    expect(resolve.mock.calls).toEqual([["auth"]]);
  } finally {
    await scope.dispose();
  }
});
