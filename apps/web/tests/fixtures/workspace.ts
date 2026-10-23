import { nanoid } from "nanoid";
import {
  LEGACY_ENTITY_ID_LENGTH,
  LEGACY_TEAM_ID_LENGTH,
} from "@wodge/domain/constants";
import { Team, WorkspaceStructure } from "@wodge/domain/workspace/models";
import { Thread, ThreadMessage } from "@wodge/domain/discussions/models";
import { UserId } from "./users";

export function createTestThread(data?: Partial<Thread>) {
  const newThread: Thread = {
    id: nanoid(LEGACY_ENTITY_ID_LENGTH),
    name: "Test Thread",

    ...data,
  };

  return newThread;
}

export function createThreadMessage(data?: Partial<ThreadMessage>) {
  const newThreadMessage: ThreadMessage = {
    id: nanoid(LEGACY_ENTITY_ID_LENGTH),
    author: UserId,
    content: "Test Message",
    createdAt: new Date().toISOString(),
    type: "message",
    ...data,
  };

  return newThreadMessage;
}

export function createTestTeam(data?: Partial<Team>) {
  const newTeam: Team = {
    createdBy: UserId,
    folders: [
      {
        name: "root",
        channels: [],
        id: "root",
      },
    ],
    id: nanoid(LEGACY_TEAM_ID_LENGTH),
    members: [],
    name: "Test Team",
    rooms: [],
    default: false,
    threads: [],
    moderators: [],

    ...data,
  };

  return newTeam;
}

export function createTestStructure(data?: Partial<WorkspaceStructure>) {
  const structure: WorkspaceStructure = {
    teams: [],

    ...data,
  };

  return structure;
}
