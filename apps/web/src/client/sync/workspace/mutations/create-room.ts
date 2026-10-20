import { workspaceError } from "./errors";
import { Room } from "@wodge/domain/rooms/models";
import { RoomSchema } from "@wodge/domain/rooms/validation";
import { DrObj } from "@wodge/domain/types";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

interface CreateTeamArgs {
  room: Room;
  teamId: string;
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
}

export function createRoomMutation({
  room,
  teamId,
  structure,
}: CreateTeamArgs) {
  // Validate the data
  const validateFields = RoomSchema.safeParse(room);

  if (!validateFields.success) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid room data");
  }

  const { data: newRoom } = validateFields;

  const newStructure = produce(structure, (draft) => {
    const team = draft.teams.find((t) => t.id === teamId);
    // Check if team not found

    if (!team) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
    }

    // Check if room already exists

    if (team.rooms.find((ch) => ch.id === newRoom.id)) {
      throw workspaceError("WORKSPACE_CONFLICT", "Chat already exists");
    } else {
      team.rooms.push(newRoom); // Add room
    }
  });

  return newStructure as WorkspaceStructure;
}
