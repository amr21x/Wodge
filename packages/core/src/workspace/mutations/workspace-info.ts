import { workspaceError } from "@wodge/core/workspace/errors";
import { Workspace } from "@wodge/domain/workspace/models";
import { WorkspaceSchema } from "@wodge/domain/workspace/validation";
import { produce } from "immer";

export interface WorkspaceUpdate {
  update: {
    name: Workspace["name"];
    avatar?: Workspace["avatar"];
  };
}

export function updateWorkspaceInfoMutation({
  update,
  workspace,
}: WorkspaceUpdate & { workspace: Workspace }) {
  // 1. Validate the update request
  const validatedFields = WorkspaceSchema.pick({
    avatar: true,
    name: true,
  })
    .strict()
    .safeParse(update);

  if (!validatedFields.success) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid team update data");
  }

  const {
    data: { name, avatar },
  } = validatedFields;

  // 3. Update the team
  const newWorkspace = produce(workspace, (draft) => {
    if (name) {
      draft.name = name;
    }

    if (avatar) {
      draft.avatar = avatar;
    }
  });

  return newWorkspace as Workspace;
}
