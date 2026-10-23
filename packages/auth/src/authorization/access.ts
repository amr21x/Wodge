import { DrObj } from "@wodge/domain/types";
import {
  WorkspaceMembers,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";

interface Common {
  structure: WorkspaceStructure | DrObj<WorkspaceStructure>;
  userId?: string;
  teamId?: string;
}

interface Membership {
  members: WorkspaceMembers | DrObj<WorkspaceMembers>;
  userId?: string;
}

// isTeamMember

export function isTeamMember({ structure, userId = "", teamId }: Common) {
  return !!structure.teams
    .find((t) => t.id === teamId)
    ?.members.includes(userId);
}

// isAdmin

export function isAdmin({ members, userId }: Membership) {
  return members.members.find((m) => m.id === userId)?.role === "admin";
}

// isTeamModerator

export function isTeamModerator({
  structure,
  userId = "",
  teamId = "",
}: Common) {
  return !!structure.teams
    .find((t) => t.id === teamId)
    ?.moderators.includes(userId);
}

export function isOwner({ members, userId }: Membership) {
  return members.members.find((m) => m.id === userId)?.role === "owner";
}
