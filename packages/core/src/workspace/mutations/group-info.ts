import { workspaceError } from "@wodge/core/workspace/errors";
import { WorkspaceGroupMutation } from "@wodge/core/workspace/mutations/types";
import { Group } from "@wodge/domain/workspace/models";
import { GroupSchema } from "@wodge/domain/workspace/validation";
import { produce } from "immer";

export interface GroupInfoUpdate extends WorkspaceGroupMutation {
  update: {
    name: Group["name"];
    color: Group["color"];
  };
}

export function updateGroupInfoMutation({
  structure,
  update,
  groupId,
}: GroupInfoUpdate) {
  // 1. Validate the update request
  const validatedFields = GroupSchema.pick({
    color: true,
    name: true,
  })
    .strict()
    .safeParse(update);

  if (!validatedFields.success) {
    throw workspaceError(
      "WORKSPACE_INVALID_INPUT",
      "Invalid group update data",
    );
  }

  const {
    data: { name, color },
  } = validatedFields;

  // 2. Check if group already exists
  const groupIdx = structure.groups.findIndex((g) => g.id === groupId);

  if (groupIdx === -1) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Group does not exist");
  }

  // 3. Update the group

  const newStructure = produce(structure, (draft) => {
    const curGroup = draft.groups[groupIdx]!;

    if (name) {
      curGroup.name = name;
    }

    if (color) {
      curGroup.color = color;
    }
  });

  return newStructure;
}
