import { nanoid } from "nanoid";
import {
  LEGACY_ENTITY_ID_LENGTH,
  LEGACY_TEAM_ID_LENGTH,
} from "@wodge/domain/constants";
import { Channel } from "@wodge/domain/channels/index";
import {
  Team,
  WorkspaceMembers,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";
import { Room, Message } from "@wodge/domain/rooms/models";
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

export function createTestChannel(data?: Partial<Channel>) {
  const channel: Channel = {
    id: nanoid(LEGACY_ENTITY_ID_LENGTH),
    name: "Test Channel",
    avatar: "",
    ...data,
  };

  return channel;
}

export function createTestRoom(data?: Partial<Room>) {
  const room: Room = {
    id: nanoid(LEGACY_ENTITY_ID_LENGTH),
    name: "Test Channel",
    avatar: "",
    ...data,
  };

  return room;
}

export function createTestMessage(data?: Partial<Message>) {
  const message: Message = {
    id: nanoid(LEGACY_ENTITY_ID_LENGTH),
    type: "text",
    content: "Hello",
    date: new Date().toISOString(),
    sender: UserId,
    pollOptions: [],
    pollVoters: [],
    votes: [],

    ...data,
  };

  return message;
}

export function createTestStructure(data?: Partial<WorkspaceStructure>) {
  const structure: WorkspaceStructure = {
    teams: [],

    ...data,
  };

  return structure;
}

export function createTestMembers(data?: Partial<WorkspaceMembers>) {
  const members: WorkspaceMembers = {
    members: [
      {
        id: UserId,
        role: "owner",
        joinInfo: {
          createdBy: "",
          joinedAt: new Date().toISOString(),
          token: "",
        },
      },
    ],
    createdBy: UserId,
    ...data,
  };

  return members;
}
