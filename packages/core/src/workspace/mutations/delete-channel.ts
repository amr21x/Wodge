import { workspaceError } from "@wodge/core/workspace/errors";
import { WorkspaceChannelMutation } from "@wodge/core/workspace/mutations/types";
import { ChannelsTypes } from "@wodge/domain/channels/index";
import { WorkspaceStructure } from "@wodge/domain/workspace/models";
import { produce } from "immer";

export function deleteChannelMutation({
  structure,
  teamId,
  folderId,
  channelId,
  type,
  userId,
  isAdmin,
}: WorkspaceChannelMutation & {
  type: ChannelsTypes;
  isAdmin: boolean;
  userId: string;
}) {
  const newStructure = produce(structure, (draft) => {
    // Check if the team not existing
    const teamIdx = draft.teams.findIndex((t) => t.id === teamId);

    if (teamIdx === -1) {
      throw workspaceError("WORKSPACE_NOT_FOUND", "Team not found");
    }

    const team = draft.teams[teamIdx]!;

    if (type === "page") {
      const folderIdx = team.folders.findIndex((f) => f.id === folderId);

      if (folderIdx === -1) {
        throw workspaceError("WORKSPACE_NOT_FOUND", "Folder not found");
      }

      draft.teams[teamIdx]!.folders[folderIdx]!.channels = team.folders[
        folderIdx
      ]!.channels.filter((c) => c.id !== channelId);
    }

    if (type === "room") {
      draft.teams[teamIdx]!.rooms = team.rooms.filter(
        (c) => c.id !== channelId,
      );
    }

    if (type === "thread") {
      draft.teams[teamIdx]!.threads = team.threads.filter(
        (c) => c.id !== channelId,
      );
    }
  });

  return newStructure as WorkspaceStructure;
}
