import { produce } from "immer";
import { DrObj, Room, RoomSchema } from "../../..";
import { TEAM_MEMBERS_ROLE } from "@wodge/domain/constants";
import { WorkspaceStructure } from "../../../schemas/workspace.schema";

interface CreateTeamArgs {
  room: Room;
  teamId: string;
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
}

export function updateRoomMutation({
  room,
  teamId,
  structure,
}: CreateTeamArgs) {
  // Validate the data
  const validateFields = RoomSchema.safeParse(room);

  if (!validateFields.success) throw new Error("Invalid page data");

  const { data: newRoom } = validateFields;

  const newStructure = produce(structure, (draft) => {
    const team = draft.teams.find((t) => t.id === teamId);
    // Check if team not found
    if (!team) throw new Error("Team not found");
    // Check if folder not found

    const roomIdx = team.rooms.findIndex((ch) => ch.id === newRoom.id);
    if (roomIdx === -1) {
      throw new Error("Page not found");
    } else {
      // check that every group id on the new page exists the workspace structure
      newRoom.editGroups.forEach((groupId) => {
        if (groupId === TEAM_MEMBERS_ROLE) return;
        if (!draft.groups.find((g) => g.id === groupId)) {
          throw new Error("Group not found");
        }
      });
      newRoom.viewGroups.forEach((groupId) => {
        if (groupId === TEAM_MEMBERS_ROLE) return;
        if (!draft.groups.find((g) => g.id === groupId)) {
          throw new Error("Group not found");
        }
      });

      team.rooms[roomIdx]! = newRoom; // Add page
    }
  });
  return newStructure as WorkspaceStructure;
}
