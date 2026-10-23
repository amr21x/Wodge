import { workspaceError } from "./errors";
import { WorkspaceTeamMutation } from "./types";
import { Team } from "@wodge/domain/workspace/models";
import { TeamSchema } from "@wodge/domain/workspace/validation";
import { produce } from "immer";

interface TeamInfoUpdate extends WorkspaceTeamMutation {
  update: {
    name: Team["name"];
    avatar?: Team["avatar"];
  };
}

export function updateTeamInfoMutation({
  structure,
  update,
  teamId,
}: TeamInfoUpdate) {
  // 1. Validate the update request
  const validatedFields = TeamSchema.pick({
    avatar: true,
    name: true,
    slug: true,
  })
    .strict()
    .safeParse(update);

  if (!validatedFields.success) {
    throw workspaceError("WORKSPACE_INVALID_INPUT", "Invalid team update data");
  }

  const {
    data: { name, avatar },
  } = validatedFields;

  // 2. Check if team already exists
  const teamIdx = structure.teams.findIndex((t) => t.id === teamId);

  if (teamIdx === -1) {
    throw workspaceError("WORKSPACE_NOT_FOUND", "Team does not exist");
  }

  // 3. Update the team

  const newStructure = produce(structure, (draft) => {
    const curTeam = draft.teams[teamIdx]!;

    if (name) {
      curTeam.name = name;
    }

    if (avatar) {
      curTeam.avatar = avatar;
    }
  });

  return newStructure;
}
