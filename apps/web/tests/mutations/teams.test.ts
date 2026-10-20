import { describe, expect, test } from "vitest";
import { createTeamMutation } from "@/client/sync/workspace/mutations/create-team";
import { deleteTeamMutation } from "@/client/sync/workspace/mutations/delete-team";
import { updateTeamInfoMutation } from "@/client/sync/workspace/mutations/team-info";
import {
  addTeamMembersMutation,
  removeTeamMembers,
} from "@/client/sync/workspace/mutations/team-members";
import {
  addTeamFolderMutation,
  deleteTeamFoldersMutation,
} from "@/client/sync/workspace/mutations/team-folders";
import { createTestStructure, createTestTeam } from "../fixtures/workspace";
import { UserId } from "../fixtures/users";

describe("team invariants", () => {
  test("creation establishes the current actor as owner and sole initial member", () => {
    const structure = createTestStructure();
    const input = createTestTeam({
      createdBy: "another-user",
      members: ["another-user"],
    });
    const result = createTeamMutation({
      team: input,
      structure,
      currentUserId: UserId,
    });

    expect(result.teams[0]).toMatchObject({
      id: input.id,
      createdBy: UserId,
      members: [UserId],
      moderators: [],
      rooms: [],
      threads: [],
      folders: [{ id: `root-${input.id}`, name: "root", channels: [] }],
    });
    expect(structure.teams).toEqual([]);
    expect(() =>
      createTeamMutation({
        team: input,
        structure: result,
        currentUserId: UserId,
      }),
    ).toThrow("Team already exists");
    expect(() =>
      createTeamMutation({
        team: { ...input, name: "" },
        structure,
        currentUserId: UserId,
      }),
    ).toThrow("Invalid team data");
  });

  test("updates validate names and preserve the team's other state", () => {
    const team = createTestTeam({ members: [UserId] });
    const structure = createTestStructure({ teams: [team] });
    const result = updateTeamInfoMutation({
      structure,
      teamId: team.id,
      update: { name: "Renamed", avatar: "" },
    });

    expect(result.teams[0]).toEqual({ ...team, name: "Renamed" });
    expect(() =>
      updateTeamInfoMutation({
        structure,
        teamId: team.id,
        update: { name: "", avatar: "" },
      }),
    ).toThrow("Invalid team update data");
  });

  test("team membership is restricted to current workspace members", () => {
    const team = createTestTeam({ members: [UserId] });
    const structure = createTestStructure({ teams: [team] });
    const result = addTeamMembersMutation({
      structure,
      teamId: team.id,
      update: { members: ["member"] },
      curMembers: [UserId, "member"],
    });

    expect(result.teams[0]?.members).toEqual([UserId, "member"]);
    expect(
      removeTeamMembers({
        structure: result,
        teamId: team.id,
        update: { members: ["member"] },
      }).teams[0]?.members,
    ).toEqual([UserId]);
    expect(() =>
      addTeamMembersMutation({
        structure,
        teamId: team.id,
        update: { members: ["outsider"] },
        curMembers: [UserId],
      }),
    ).toThrow("Invalid members");
  });

  test("folders require an existing parent and cannot duplicate an identifier", () => {
    const team = createTestTeam();
    const structure = createTestStructure({ teams: [team] });
    const folder = { id: "1234567890123456", name: "Documents", channels: [] };
    const result = addTeamFolderMutation({
      structure,
      teamId: team.id,
      update: { folder },
    });

    expect(result.teams[0]?.folders).toContainEqual(folder);
    expect(() =>
      addTeamFolderMutation({
        structure: result,
        teamId: team.id,
        update: { folder },
      }),
    ).toThrow("Folder already exists in team");
    expect(() =>
      addTeamFolderMutation({
        structure,
        teamId: team.id,
        update: { folder: { ...folder, parentFolder: "missing" } },
      }),
    ).toThrow("Parent folder does not exist in team");
    expect(
      deleteTeamFoldersMutation({
        structure: result,
        teamId: team.id,
        update: { folders: [folder.id] },
      }).teams[0]?.folders,
    ).toEqual(team.folders);
  });

  test("deletion preserves the last team and removes only the selected team", () => {
    const team = createTestTeam();
    const other = createTestTeam();

    expect(() =>
      deleteTeamMutation({
        structure: createTestStructure({ teams: [team] }),
        teamId: team.id,
      }),
    ).toThrow("Cannot delete the last team");
    const structure = createTestStructure({ teams: [team, other] });

    expect(deleteTeamMutation({ structure, teamId: team.id }).teams).toEqual([
      other,
    ]);
    expect(() => deleteTeamMutation({ structure, teamId: "missing" })).toThrow(
      "Team not found",
    );
  });
});
