import type { WorkspaceRecord } from "@wodge/core/workspace/models";
import { WorkspaceDirectory } from "@wodge/core/workspace/services/directory";
import { expect, test, vi } from "vitest";

function fixture(premium = false, count = 1) {
  const workspace: WorkspaceRecord = {
    id: "workspace",
    owner: "owner",
    name: "Workspace",
    slug: "workspace",
    avatar: null,
    createdAt: new Date(),
    isInviteLinkEnabled: true,
    isPremium: premium,
    customerId: null,
  };
  const invite = {
    workspaceId: workspace.id,
    token: "invite",
    createdBy: "owner",
    emails: null,
  };
  const repository = {
    getWorkspaceById: vi.fn<[], Promise<WorkspaceRecord | undefined>>(
      async () => workspace,
    ),
    getInvite: vi.fn<[], Promise<typeof invite | undefined>>(
      async () => invite,
    ),
    countMembers: vi.fn(async () => count),
    getMembership: vi.fn<
      [],
      Promise<{ userId: string; workspaceId: string } | undefined>
    >(async () => undefined),
    getMemberIds: vi.fn(async () => []),
    ensureInvite: vi.fn(),
    saveInvite: vi.fn(),
    toggleInvite: vi.fn(),
    getInvites: vi.fn(),
  };
  const identity = {
    isAdmin: vi.fn(async () => true),
    create: vi.fn(async () => ({ id: workspace.id })),
    join: vi.fn(async () => {}),
  };
  const service = new WorkspaceDirectory(repository, {
    getUserInfoById: async () => [],
  });
  return { service, repository, identity, workspace, invite };
}

test.each([
  [false, 9, true],
  [false, 10, false],
  [true, 49, true],
  [true, 50, false],
])(
  "join applies the core membership limit: premium=%s count=%i allowed=%s",
  async (premium, count, allowed) => {
    const f = fixture(premium, count);
    expect(
      await f.service.validateJoin("member", "workspace", "invite"),
    ).toEqual(allowed ? f.invite : null);
  },
);

test.each(["missing invite", "missing workspace", "disabled link"])(
  "join rejects %s before any identity write",
  async (reason) => {
    const f = fixture();
    if (reason === "missing invite")
      f.repository.getInvite.mockResolvedValue(undefined);
    if (reason === "missing workspace")
      f.repository.getWorkspaceById.mockResolvedValue(undefined);
    if (reason === "disabled link") f.workspace.isInviteLinkEnabled = false;
    if (reason === "existing member")
      f.repository.getMembership.mockResolvedValue({
        userId: "member",
        workspaceId: "workspace",
      });
    expect(
      await f.service.validateJoin("member", "workspace", "invite"),
    ).toBeNull();
  },
);

test("admission propagates data-access failures before any identity write", async () => {
  const f = fixture();
  const failure = new Error("database unavailable");
  f.repository.countMembers.mockRejectedValue(failure);
  await expect(
    f.service.validateJoin("member", "workspace", "invite"),
  ).rejects.toBe(failure);
});

test("existing members with a valid invite may retry projection synchronization even at capacity", async () => {
  const f = fixture(false, 10);
  f.repository.getMembership.mockResolvedValue({
    userId: "member",
    workspaceId: "workspace",
  });
  expect(await f.service.validateJoin("member", "workspace", "invite")).toBe(
    f.invite,
  );
  expect(f.repository.countMembers).not.toHaveBeenCalled();
});
