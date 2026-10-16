import { nanoid } from "nanoid";
import {
  ID_LENGTH,
  TEAM_MEMBERS_ROLE,
  WORKSPACE_TEAM_ID_LENGTH,
} from "@wodge/domain/constants";
import { Folder, Team } from "../../schemas/team.schema";
import {
  Invite,
  Member,
  WorkspaceMembers,
  WorkspaceStructure,
} from "../../schemas/workspace.schema";
import { Room } from "../../schemas/room.schema";
import { Page } from "@wodge/domain/pages";
import { Thread } from "../../schemas/thread.schema";

export const createWelcomePage = (): Page => ({
  id: nanoid(ID_LENGTH),
  editGroups: [TEAM_MEMBERS_ROLE],
  viewGroups: [TEAM_MEMBERS_ROLE],
  name: "Welcome",
  avatar: "",
});

export const createWelcomeRoom = (): Room => ({
  id: nanoid(ID_LENGTH),
  editGroups: [TEAM_MEMBERS_ROLE],
  viewGroups: [TEAM_MEMBERS_ROLE],
  name: "Welcome",
  avatar: "",
});
export const createWelcomeThread = (): Thread => ({
  id: nanoid(ID_LENGTH),
  editGroups: [TEAM_MEMBERS_ROLE],
  viewGroups: [TEAM_MEMBERS_ROLE],
  name: "Welcome",
  avatar: "",
});

export const createRootFolder = (teamId: string): Folder => ({
  name: "root",
  channels: [createWelcomePage()],
  id: "root-" + teamId,
});

export const createDefaultTeam = (createdBy: string): Team => {
  const teamId = nanoid(WORKSPACE_TEAM_ID_LENGTH);
  return {
    id: teamId,
    name: "General",
    avatar: "",
    moderators: [],
    members: [createdBy],
    createdBy: createdBy,
    default: true,
    folders: [createRootFolder(teamId)],
    threads: [createWelcomeThread()],
    rooms: [createWelcomeRoom()],
    // tags: [],
  };
};

export function defaultWorkspaceMembers(): WorkspaceMembers {
  return {
    createdBy: "",
    members: [],
  };
}

export function defaultWorkspaceStructure(): WorkspaceStructure {
  return {
    teams: [],
    groups: [],
  };
}

export const addWorkspaceMember = (
  userId: string,
  role: Member["role"],
  invite: Invite
) =>
  ({
    id: userId,
    role,
    joinInfo: {
      joinedAt: new Date().toISOString(),
      token: invite.token!,
      createdBy: invite.createdBy!,
    },
  }) satisfies Member;
