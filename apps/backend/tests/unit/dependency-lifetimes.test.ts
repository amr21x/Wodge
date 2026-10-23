import { attachSql } from "../helpers/sqlite";
import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";
import { BetterAuthMembership } from "@wodge/auth/membership";
import { PageService } from "@wodge/core/pages/services/page";
import { S3ObjectStorage } from "@wodge/infra/storage/object-storage";
import { expect, test, vi } from "vitest";
import { createRuntimeContainer } from "../../src/container";
import { PageSync } from "../../src/lib/sync/pages";
import { PageRoutes } from "../../src/routes/pages";
import type PageServer from "../../src/servers/page";
import type WorkspaceServer from "../../src/servers/workspace";
import type { WorkerEnvironment } from "../../src/types/worker-environment";
import { createTestEnvironment } from "../helpers/environment";

const actor = {
  userId: "owner",
  isOwner: true,
  isAdmin: false,
  isTeamModerator: false,
  canEdit: true,
  canView: true,
};
function page(name: string) {
  return {
    name,
    env: createTestEnvironment(),
    ctx: {
      storage: attachSql({
        get: vi.fn(async () => undefined),
        list: vi.fn(async () => new Map()),
        put: vi.fn(async () => {}),
      }),
    },
    versions: new Map([["globalVersion", 0]]),
    state: {
      record: {
        data: { columns: [], tasks: [] },
        lastModifiedVersion: 0,
        deleted: false,
      },
    },
  } as unknown as PageServer;
}

test("one activation reuses its service, sync adapter, router and handler graph", async () => {
  const object = page("one");
  const container = createRuntimeContainer(object.env, {
    type: "page",
    instance: object,
  });
  try {
    const router = container.resolve(PageRoutes).router;
    expect(container.resolve(PageRoutes).router).toBe(router);
    expect(container.resolve(PageService)).toBe(container.resolve(PageService));
    expect(container.resolve("objectDatabase")).toBe(
      container.resolve("objectDatabase"),
    );
    expect(container.resolve("objectDatabase")).not.toBe(
      container.resolve("database"),
    );
    expect(container.resolve(PageSync)).toBe(container.resolve(PageSync));
    for (const revision of [2, 7])
      await container.resolve(PageSync).run(
        {
          mutation: {
            name: "createColumn",
            id: revision,
            clientID: "client",
            args: { id: `column-${revision}`, title: "Column" },
          },
          nextVersion: revision,
          userId: "owner",
        },
        actor,
      );
    expect(object.state.record.lastModifiedVersion).toBe(7);
    expect(object.state.record.data.columns).toHaveLength(2);
    for (const token of [
      "principal",
      "requestHeaders",
      "revision",
      "http",
      "roomGrantState",
    ])
      expect(container.isRegistered(token)).toBe(false);
  } finally {
    await container.dispose();
  }
});

test("different objects never share object-bound instances or mutation revisions", async () => {
  const one = page("one"),
    two = page("two");
  const first = createRuntimeContainer(one.env, {
    type: "page",
    instance: one,
  });
  const second = createRuntimeContainer(two.env, {
    type: "page",
    instance: two,
  });
  try {
    expect(first.resolve(PageService)).not.toBe(second.resolve(PageService));
    expect(first.resolve("objectDatabase")).not.toBe(
      second.resolve("objectDatabase"),
    );
    await Promise.all([
      first
        .resolve(PageService)
        .createColumn({ id: "a", title: "A" }, actor, 3),
      second
        .resolve(PageService)
        .createColumn({ id: "b", title: "B" }, actor, 9),
    ]);
    expect(one.state.record.lastModifiedVersion).toBe(3);
    expect(two.state.record.lastModifiedVersion).toBe(9);
    expect(one.state.record.data.columns.map((c) => c.id)).toEqual(["a"]);
    expect(two.state.record.data.columns.map((c) => c.id)).toEqual(["b"]);
  } finally {
    await Promise.all([first.dispose(), second.dispose()]);
  }
});

test("one authorization instance accepts concurrent identities without capturing either", async () => {
  const object = {
    name: "workspace",
    env: createTestEnvironment(),
    ctx: { storage: {} },
    workspaceMembers: { data: { createdBy: "owner", members: [] } },
    workspaceStructure: { data: { teams: [] } },
  } as unknown as WorkspaceServer;
  const container = createRuntimeContainer(object.env, {
    type: "workspace",
    instance: object,
  });
  const validate = vi.fn(async () => null);
  container.registerInstance(BetterAuthMembership, { validate } as never);
  try {
    const authorization = container.resolve(WorkspaceAuthorization);
    const identities = [
      { userId: "alice", sessionId: "a" },
      { userId: "bob", sessionId: "b" },
    ];
    await Promise.all(
      identities.map((identity) =>
        expect(
          authorization.hasPermission(
            {
              scope: { type: "workspace", id: "workspace" },
              permissions: { workspace: ["read"] },
            },
            identity,
          ),
        ).rejects.toMatchObject({ code: "AUTHORIZATION_FORBIDDEN" }),
      ),
    );
    expect(validate.mock.calls).toEqual(
      identities.map((identity) => [identity, "workspace"]),
    );
  } finally {
    await container.dispose();
  }
});

test("TSyringe owns and disposes class-created SDK wrappers exactly once", async () => {
  const dispose = vi.spyOn(S3ObjectStorage.prototype, "dispose");
  const container = createRuntimeContainer(
    createTestEnvironment() as WorkerEnvironment,
  );
  try {
    expect(container.resolve(S3ObjectStorage)).toBe(
      container.resolve(S3ObjectStorage),
    );
    await container.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  } finally {
    dispose.mockRestore();
  }
});
