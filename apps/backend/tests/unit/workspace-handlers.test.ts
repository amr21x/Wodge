import { Hono } from "hono";
import { expect, test, vi } from "vitest";
import { handleError } from "../../src/errors/handler";
import { WorkspaceHandlers } from "../../src/handlers/api/workspace";
import type { ApiContext } from "../../src/types/hono-context";

function fixture() {
  const sequence: string[] = [];
  const memberships = {
    isAdmin: vi.fn(async () => false),
    create: vi.fn(async () => {
      sequence.push("identity");
      return { id: "workspace" };
    }),
    join: vi.fn(async () => {
      sequence.push("identity");
    }),
    remove: vi.fn(async () => {}),
    removeMember: vi.fn(async () => {}),
  };
  const repository = {
    getWorkspaceById: vi.fn(async () => ({ id: "workspace" })),
  };
  const gateway = {
    synchronizeOrganization: vi.fn(async () => {
      sequence.push("synchronize");
    }),
  };
  const directory = {
    validateJoin: vi.fn(async () => ({ token: "invite" })),
    rotateInvite: vi.fn(),
    listInvites: vi.fn(),
  };
  const handlers = new WorkspaceHandlers(
    memberships as never,
    gateway as never,
    directory as never,
    { get: repository.getWorkspaceById } as never,
  );
  const app = new Hono<ApiContext>();
  app.onError(handleError);
  app.use("*", async (c, next) => {
    c.set("user", { id: "member" } as never);
    await next();
  });
  app.post("/:workspaceId/join/:token", handlers.joinWorkspace);
  app.post("/:workspaceId/invite", handlers.invites);
  app.delete("/:workspaceId", handlers.deleteWorkspace);
  return { app, memberships, gateway, directory, sequence };
}

test("join handler performs identity writes before synchronizing projections", async () => {
  const f = fixture();
  const response = await f.app.request("/workspace/join/invite", {
    method: "POST",
  });
  expect(response.status).toBe(200);
  expect(f.sequence).toEqual(["identity", "synchronize"]);
  expect(f.memberships.join).toHaveBeenCalledWith("workspace", "member");
});

test("an authoritative identity rejection never proceeds to synchronization or reports success", async () => {
  const f = fixture();
  f.memberships.join.mockRejectedValue(new Error("authoritative limit"));
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(
      (await f.app.request("/workspace/join/invite", { method: "POST" }))
        .status,
    ).toBe(500);
    expect(f.gateway.synchronizeOrganization).not.toHaveBeenCalled();
  } finally {
    log.mockRestore();
  }
});

test("failed synchronization is reported and a retry reconciles an already admitted member", async () => {
  const f = fixture();
  f.gateway.synchronizeOrganization.mockRejectedValueOnce(
    new Error("object unavailable"),
  );
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    expect(
      (await f.app.request("/workspace/join/invite", { method: "POST" }))
        .status,
    ).toBe(500);
    expect(
      (await f.app.request("/workspace/join/invite", { method: "POST" }))
        .status,
    ).toBe(200);
    expect(f.gateway.synchronizeOrganization).toHaveBeenCalledTimes(2);
  } finally {
    log.mockRestore();
  }
});

test("handler authorization precedes invite and organization mutations", async () => {
  const f = fixture();
  expect(
    (await f.app.request("/workspace/invite", { method: "POST" })).status,
  ).toBe(403);
  expect((await f.app.request("/workspace", { method: "DELETE" })).status).toBe(
    403,
  );
  expect(f.directory.rotateInvite).not.toHaveBeenCalled();
  expect(f.memberships.remove).not.toHaveBeenCalled();
});
