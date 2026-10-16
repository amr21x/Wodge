import { beforeAll, describe, expect, test } from "vitest";
import {
  createTestChannel,
  createTestGroup,
  createTestMembers,
  createTestStructure,
  createTestTeam,
} from "../utils";
import { WorkspaceStructure } from "../../schemas/workspace.schema";
import { createTeamMutation } from "../../models/workspace/mutators/create-team";
import { UserId } from "../tests";
import {
  canEdit,
  canView,
  isTeamMember,
  isTeamModerator,
} from "../../lib/rbac";
import { teamUpdateRunner } from "../../models/workspace/mutators/team-update-runner";
import { createGroupMutation } from "../../models/workspace/mutators/create-group";
import { nanoid } from "nanoid";
import { ID_LENGTH, WORKSPACE_TEAM_ID_LENGTH } from "@wodge/domain/constants";
import { createPageMutation } from "../../models/workspace/mutators/create-page";
import { groupUpdateRunner } from "../../models/workspace/mutators/group-update-runner";

// const structure = createTestStructure();
let newStructure: WorkspaceStructure;

describe("RBAC test suite", () => {
  beforeAll(() => {
    newStructure = createTeamMutation({
      team: createTestTeam(),
      structure: createTestStructure(),
      currentUserId: UserId,
    });
  });

  test("Team membership", () => {
    expect(
      isTeamMember({
        structure: newStructure,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
      })
    ).toBe(true);

    expect(
      isTeamMember({
        structure: newStructure,
        userId: UserId,
        teamId: "non-existing-team-id",
      })
    ).toBe(false);

    expect(
      isTeamMember({
        structure: newStructure,
        userId: "non-existing-user-id",
        teamId: newStructure.teams[0]!.id,
      })
    ).toBe(false);
  });

  test("Team moderator", () => {
    const struc = teamUpdateRunner({
      teamId: newStructure.teams[0]!.id,
      curMembers: newStructure.teams[0]!.members,
      structure: newStructure,
      teamUpdate: {
        action: "changeTeamMemberRole",
        update: {
          memberId: UserId,
          role: "moderator",
        },
      },
    }) as WorkspaceStructure;

    expect(
      isTeamModerator({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
      })
    ).toBe(true);

    expect(
      isTeamModerator({
        structure: struc,
        userId: UserId,
        teamId: "non-existing-team-id",
      })
    ).toBe(false);

    expect(
      isTeamModerator({
        structure: struc,
        userId: "non-existing-user-id",
        teamId: newStructure.teams[0]!.id,
      })
    ).toBe(false);
  });

  test("Can edit", () => {
    const grpId = nanoid(WORKSPACE_TEAM_ID_LENGTH);
    let struc = createGroupMutation({
      group: createTestGroup({
        members: [UserId],
        id: grpId,
      }),
      structure: newStructure,
      currentUserId: UserId,
    });

    struc = groupUpdateRunner({
      curMembers: [UserId],
      groupId: grpId,
      structure: struc,
      groupUpdate: {
        action: "addMembers",
        update: {
          members: [UserId],
        },
      },
    }) as WorkspaceStructure;

    const chanId = nanoid(ID_LENGTH);
    const chanId2 = nanoid(ID_LENGTH);
    const chanId3 = nanoid(ID_LENGTH);

    // default page for all team members
    struc = createPageMutation({
      page: createTestChannel({ id: chanId }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canEdit({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      })
    ).toBe(true);

    struc = createPageMutation({
      page: createTestChannel({ id: chanId2, editGroups: [] }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canEdit({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId2,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      })
    ).toBe(false);

    struc = createPageMutation({
      page: createTestChannel({ id: chanId3, editGroups: [grpId] }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canEdit({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId3,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      })
    ).toBe(true);
  });

  test("Can view", () => {
    const grpId = nanoid(WORKSPACE_TEAM_ID_LENGTH);
    let struc = createGroupMutation({
      group: createTestGroup({
        members: [UserId],
        id: grpId,
      }),
      structure: newStructure,
      currentUserId: UserId,
    });

    struc = groupUpdateRunner({
      curMembers: [UserId],
      groupId: grpId,
      structure: struc,
      groupUpdate: {
        action: "addMembers",
        update: {
          members: [UserId],
        },
      },
    }) as WorkspaceStructure;

    const chanId = nanoid(ID_LENGTH);
    const chanId2 = nanoid(ID_LENGTH);
    const chanId3 = nanoid(ID_LENGTH);

    // default page for all team members
    struc = createPageMutation({
      page: createTestChannel({ id: chanId }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canView({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      })
    ).toBe(true);

    struc = createPageMutation({
      page: createTestChannel({ id: chanId2, viewGroups: [] }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canView({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId2,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      })
    ).toBe(false);

    struc = createPageMutation({
      page: createTestChannel({ id: chanId3, viewGroups: [grpId] }),
      structure: struc,
      teamId: newStructure.teams[0]!.id,
      folderId: "root-" + newStructure.teams[0]!.id,
    });

    expect(
      canView({
        structure: struc,
        userId: UserId,
        teamId: newStructure.teams[0]!.id,
        channelId: chanId3,
        channelType: "page",
        folderId: "root-" + newStructure.teams[0]!.id,
        members: createTestMembers(),
      })
    ).toBe(true);
  });
});
