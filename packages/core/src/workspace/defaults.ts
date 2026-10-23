import { Thread } from "@wodge/domain/discussions/models";
import { createEntityId } from "@wodge/domain/identifiers";
import { Page } from "@wodge/domain/pages/models";
import { Room } from "@wodge/domain/rooms/models";
import {
  Folder,
  Team,
  WorkspaceMembers,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";

export const createWelcomePage = (): Page => ({
  id: createEntityId(),
  name: "Welcome",
  avatar: "",
});

export const createWelcomeRoom = (): Room => ({
  id: createEntityId(),
  name: "Welcome",
  avatar: "",
});

export const createWelcomeThread = (): Thread => ({
  id: createEntityId(),
  name: "Welcome",
  avatar: "",
});

export const createRootFolder = (teamId: string): Folder => ({
  name: "root",
  channels: [createWelcomePage()],
  id: "root-" + teamId,
});

export const createDefaultTeam = (createdBy: string): Team => {
  const teamId = createEntityId();

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
  };
}
