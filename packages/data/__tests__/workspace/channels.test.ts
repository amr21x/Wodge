// // import test from "node:test";
// import { describe, expect, test } from "vitest";
// import {
//   createTestChannel,
//   createTestStructure,
//   createTestTeam,
// } from "../utils";
// import { createChannelMutation } from "../../models/workspace/mutators/create-channel";
// import { updateChannelInfoMutation } from "../../models/workspace/mutators/channel-info";
// import { deleteChannelMutation } from "../../models/workspace/mutators/delete-channel";
// import { nanoid } from "nanoid";
// import { WORKSPACE_TEAM_ID_LENGTH } from "@wodge/domain/constants";

// describe("Workspace channels' unit mutations", () => {
//   test("Create a channel", async () => {
//     // Create starters
//     const folderId = nanoid(WORKSPACE_TEAM_ID_LENGTH);
//     const team = createTestTeam({
//       folders: [
//         {
//           name: "TEST",
//           id: folderId,
//           channels: [],
//           editGroups: [],
//           viewGroups: [],
//         },
//       ],
//     });
//     const structure = createTestStructure({ teams: [team] });
//     const channel1 = createTestChannel();

//     //Test valid channel
//     const chn1 = createChannelMutation({
//       channel: channel1,
//       folderId,
//       teamId: team.id,
//       structure,
//     });
//     expect(
//       chn1.teams
//         .find((t) => t.id === team.id)
//         ?.folders.find((f) => f.id === folderId)?.channels
//     ).toContainEqual(channel1);

//     // Test invalid
//     const channel2 = createTestChannel({ name: "" });
//     expect(() =>
//       createChannelMutation({
//         channel: channel2,
//         folderId,
//         teamId: team.id,
//         structure,
//       })
//     ).toThrowError(/^Invalid channel data$/);

//     // Test team non existent
//     expect(() =>
//       createChannelMutation({
//         channel: channel1,
//         folderId,
//         teamId: nanoid(WORKSPACE_TEAM_ID_LENGTH),
//         structure,
//       })
//     ).toThrowError(/^Team not found$/);

//     // Test folder non existent
//     expect(() =>
//       createChannelMutation({
//         channel: channel1,
//         folderId: nanoid(WORKSPACE_TEAM_ID_LENGTH),
//         teamId: team.id,
//         structure,
//       })
//     ).toThrowError(/^Folder not found$/);

//     // Test channel already existed
//     const channel3 = createTestChannel();
//     const channel4 = createTestChannel({ id: channel3.id });
//     const chn3 = createChannelMutation({
//       channel: channel3,
//       folderId,
//       teamId: team.id,
//       structure,
//     });
//     expect(() =>
//       createChannelMutation({
//         channel: channel4,
//         folderId,
//         teamId: team.id,
//         structure: chn3,
//       })
//     ).toThrowError(/^Channel already exists$/);
//   });

//   test("Update a channel", async () => {
//     const teamId = nanoid(WORKSPACE_TEAM_ID_LENGTH);
//     const folderId = nanoid(WORKSPACE_TEAM_ID_LENGTH);
//     const channelId = nanoid(WORKSPACE_TEAM_ID_LENGTH);
//     const channel = createTestChannel({ id: channelId, name: "Test" });
//     const team = createTestTeam({
//       id: teamId,
//       folders: [
//         {
//           id: folderId,
//           name: "fold test",
//           channels: [channel],
//           editGroups: [],
//           viewGroups: [],
//         },
//       ],
//     });
//     const structure = createTestStructure({ teams: [team] });

//     const s1 = updateChannelInfoMutation({
//       structure,
//       update: { name: "New Name" },
//       channelId: channel.id,
//       folderId,
//       teamId,
//     });

//     expect(
//       s1.teams
//         .find((t) => t.id === team.id)
//         ?.folders.find((f) => f.id === folderId)?.channels
//     ).toEqual([{ ...channel, name: "New Name" }]);

//     // Test invalid data
//     expect(() =>
//       updateChannelInfoMutation({
//         structure,
//         update: { name: "" },
//         channelId: channel.id,
//         folderId,
//         teamId,
//       })
//     ).toThrowError(/^Invalid channel update data$/);

//     // Test team not found
//     expect(() =>
//       updateChannelInfoMutation({
//         structure,
//         update: { name: "NewName" },
//         channelId: channel.id,
//         folderId,
//         teamId: nanoid(WORKSPACE_TEAM_ID_LENGTH),
//       })
//     ).toThrowError(/^Team not found$/);

//     // Test folder not found
//     expect(() =>
//       updateChannelInfoMutation({
//         structure,
//         update: { name: "NewName" },
//         channelId: channel.id,
//         folderId: nanoid(WORKSPACE_TEAM_ID_LENGTH),
//         teamId,
//       })
//     ).toThrowError(/^Folder not found$/);

//     // Test channel not found
//     expect(() =>
//       updateChannelInfoMutation({
//         structure,
//         update: { name: "NewName" },
//         channelId: nanoid(WORKSPACE_TEAM_ID_LENGTH),
//         folderId,
//         teamId,
//       })
//     ).toThrowError(/^Channel not found$/);
//   });

//   test("Delete a channel", async () => {
//     const folderId = nanoid(WORKSPACE_TEAM_ID_LENGTH);
//     const channel = createTestChannel({ name: "Test" });
//     const team = createTestTeam({
//       folders: [
//         {
//           name: "folder1",
//           id: folderId,
//           channels: [channel],
//           editGroups: [],
//           viewGroups: [],
//         },
//       ],
//     });
//     const structure = createTestStructure({ teams: [team] });

//     const s1 = deleteChannelMutation({
//       structure,
//       teamId: team.id,
//       folderId,
//       channelId: channel.id,
//     });

//     // Test delete channel
//     expect(
//       s1.teams
//         .find((t) => t.id === team.id)
//         ?.folders.find((f) => f.id === folderId)?.channels
//     ).not.toContain(channel);

//     // Test team not found
//     expect(() =>
//       deleteChannelMutation({
//         structure,
//         teamId: nanoid(WORKSPACE_TEAM_ID_LENGTH),
//         folderId,
//         channelId: channel.id,
//       })
//     ).toThrowError(/^Team not found$/);

//     // Test folder not found
//     expect(() =>
//       deleteChannelMutation({
//         structure,
//         teamId: team.id,
//         folderId: nanoid(WORKSPACE_TEAM_ID_LENGTH),
//         channelId: channel.id,
//       })
//     ).toThrowError(/^Folder not found$/);

//     expect(() =>
//       deleteChannelMutation({
//         structure,
//         teamId: team.id,
//         folderId: folderId,
//         channelId: nanoid(WORKSPACE_TEAM_ID_LENGTH),
//       })
//     ).toThrowError(/^Channel not found$/);
//   });
// });
