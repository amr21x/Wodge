// @vitest-environment node
import { WorkspaceAccess } from "@wodge/auth/authorization/workspace-access";
import { Hono } from "hono";
import { expect, test, vi } from "vitest";
import { createRuntimeContainer } from "../../src/container";
import { requireWorkspaceAccess } from "../../src/middleware/workspace/access";
import type { WorkspaceContext } from "../../src/types/hono-context";
import type { WorkerEnvironment } from "../../src/types/worker-environment";

test.each([
  [false, true, 401],
  [true, false, 401],
  [true, true, 200],
] as const)(
  "team file writes require membership (%s) and moderation (%s)",
  async (member, moderator, status) => {
    const access = {
      canJoinTeam: vi.fn(() => member),
      canModerateTeam: vi.fn(() => moderator),
    };
    const app = new Hono<WorkspaceContext>();
    app.post(
      "/files/:teamId",
      requireWorkspaceAccess("team-write", access as never),
      (c) => c.json({ ok: true }),
    );
    const scope = createRuntimeContainer({} as WorkerEnvironment);
    scope.registerInstance(WorkspaceAccess, access as never);
    const response = await app.request(
      "https://test/files/team",
      { method: "POST", headers: { "x-user-id": "user" } },
      { container: scope } as unknown as WorkerEnvironment,
    );
    expect(response.status).toBe(status);
    expect(access.canJoinTeam).toHaveBeenCalledWith("user", "team");
  },
);
