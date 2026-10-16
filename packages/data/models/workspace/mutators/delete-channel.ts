import { produce } from "immer";
import { WorkspaceChannelMutation } from "./types";
import { ChannelsTypes } from "@wodge/domain/channels";
import { WorkspaceStructure } from "../../../schemas/workspace.schema";

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
    if (teamIdx === -1) throw new Error("Team not found");

    const team = draft.teams[teamIdx]!;

    if (type === "page") {
      const folderIdx = team.folders.findIndex((f) => f.id === folderId);
      if (folderIdx === -1) throw new Error("Folder not found");
      draft.teams[teamIdx]!.folders[folderIdx]!.channels = team.folders[
        folderIdx
      ]!.channels.filter((c) => c.id !== channelId);
    }

    if (type === "room") {
      draft.teams[teamIdx]!.rooms = team.rooms.filter(
        (c) => c.id !== channelId
      );
    }

    if (type === "thread") {
      draft.teams[teamIdx]!.threads = team.threads.filter(
        (c) => c.id !== channelId
      );
    }
  });

  return newStructure as WorkspaceStructure;
}
