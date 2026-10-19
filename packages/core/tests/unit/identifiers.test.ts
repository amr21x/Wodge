import { expect, test } from "vitest";
import { createEntityId, entityIdSchema } from "@wodge/domain/identifiers";
import { createDefaultTeam } from "@wodge/core/workspace/defaults";
import {
  GroupSchema,
  TeamSchema,
  FolderSchema,
  workspaceInputSchemas,
} from "@wodge/domain/workspace/validation";
import { ChannelSchema } from "@wodge/domain/channels/index";
import { ThreadSchema } from "@wodge/domain/discussions/validation";
import { createTeamMutation } from "@wodge/core/workspace/mutations/create-team";
import { authOrganizations, authUsers } from "@wodge/domain/auth/schema/d1";

const uuid7 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("new IDs are unique UUIDv7 values ordered by generation time", () => {
  const before = Date.now();
  const ids = Array.from({ length: 200 }, createEntityId);
  const after = Date.now();

  expect(new Set(ids).size).toBe(ids.length);
  expect(ids).toEqual([...ids].sort());

  for (const id of ids) {
    expect(id).toMatch(uuid7);
    const timestamp = Number.parseInt(id.replaceAll("-", "").slice(0, 12), 16);

    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  }
});

test("compatibility validation accepts UUIDv7 and the existing format without admitting arbitrary new IDs", () => {
  expect(entityIdSchema(16).parse("legacy-group-123")).toBe("legacy-group-123");
  expect(entityIdSchema(21).parse("legacy-channel-123456")).toBe(
    "legacy-channel-123456",
  );
  expect(entityIdSchema(16).safeParse(createEntityId()).success).toBe(true);

  for (const id of [
    "short",
    "00000000-0000-4000-8000-000000000000",
    "00000000-0000-7000-0000-000000000000",
  ]) {
    expect(entityIdSchema(16).safeParse(id).success).toBe(false);
  }
});

test("default teams and welcome channels use UUIDv7 while structural root keys remain deterministic", () => {
  const team = createDefaultTeam("owner");

  expect(team.id).toMatch(uuid7);
  expect(TeamSchema.safeParse(team).success).toBe(true);

  for (const channel of [
    ...team.rooms,
    ...team.threads,
    ...team.folders.flatMap((folder) => folder.channels),
  ]) {
    expect(channel.id).toMatch(uuid7);
  }

  expect(team.folders[0]?.id).toBe("root-" + team.id);
  expect(FolderSchema.safeParse(team.folders[0]).success).toBe(true);
});

test("new UUID teams, groups, folders and channel permissions pass the shared write schemas", () => {
  const teamId = createEntityId(),
    groupId = createEntityId();

  expect(
    workspaceInputSchemas.createTeam.safeParse({ id: teamId, name: "Team" })
      .success,
  ).toBe(true);
  expect(
    GroupSchema.safeParse({
      id: groupId,
      name: "Group",
      members: [],
      createdBy: "owner",
    }).success,
  ).toBe(true);
  expect(
    FolderSchema.safeParse({
      id: createEntityId(),
      name: "Folder",
      channels: [],
    }).success,
  ).toBe(true);
  const channel = {
    id: createEntityId(),
    name: "Channel",
    viewGroups: [groupId],
    editGroups: [groupId],
  };

  expect(ChannelSchema.safeParse(channel).success).toBe(true);
  expect(ThreadSchema.safeParse(channel).success).toBe(true);
});

test("existing records and UUID records can coexist without regenerating stored identities", () => {
  const legacy = { id: "1234567890123456", name: "Legacy" };
  const first = createTeamMutation({
    team: legacy,
    currentUserId: "owner",
    structure: { teams: [], groups: [] },
  });
  const added = createTeamMutation({
    team: { id: createEntityId(), name: "New" },
    currentUserId: "owner",
    structure: first,
  });

  expect(added.teams[0]?.id).toBe(legacy.id);
  expect(added.teams[0]?.folders[0]?.id).toBe("root-" + legacy.id);
  expect(added.teams[1]?.id).toMatch(uuid7);
});

test("database-generated user and workspace defaults use UUIDv7", () => {
  expect(authUsers.id.defaultFn?.()).toMatch(uuid7);
  expect(authOrganizations.id.defaultFn?.()).toMatch(uuid7);
});
