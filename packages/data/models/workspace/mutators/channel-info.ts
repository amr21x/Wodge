import { Channel, ChannelSchema } from "@wodge/domain/channels";
import { WorkspaceChannelMutation } from "./types";
import { produce } from "immer";

export interface ChannelInfoUpdate extends WorkspaceChannelMutation {
  update: {
    name: Channel["name"];
    // avatar?: Channel["avatar"];
  };
}

export function updateChannelInfoMutation({
  structure,
  update,
  channelId,
  folderId,
  teamId,
}: ChannelInfoUpdate) {
  // 1. validate the request
  const validatedFields = ChannelSchema.pick({
    // avatar: true,
    name: true,
  })
    .strict()
    .safeParse(update);

  if (!validatedFields.success) throw new Error("Invalid channel update data");

  const {
    data: { name },
  } = validatedFields;

  const newStructure = produce(structure, (draft) => {
    // 2. Check if team not existed
    const team = draft.teams.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");
    // 3. Check if folder not existed
    const folder = team.folders.find((f) => f.id === folderId);
    if (!folder) throw new Error("Folder not found");
    // 4. Update the channel
    const curChannel = folder.channels.find((c) => c.id === channelId);
    if (curChannel) {
      if (name) curChannel.name = name;
      // if (avatar) curChannel.avatar = avatar;
    } else {
      throw new Error("Channel not found");
    }
  });

  return newStructure;
}
