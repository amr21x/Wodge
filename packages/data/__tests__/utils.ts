import { nanoid } from "nanoid";
import {
  BRAND_COLOR,
  ID_LENGTH,
  TEAM_MEMBERS_ROLE,
  WORKSPACE_TEAM_ID_LENGTH,
} from "@wodge/domain/constants";
import { Channel } from "@wodge/domain/channels";
import { Group, Room, Message, Team, Thread, WorkspaceMembers, WorkspaceStructure, ThreadMessage } from "..";
import { UserId } from "./tests";

export function createTestThread(data?: Partial<Thread>) {
  const newThread: Thread = {
    id: nanoid(ID_LENGTH),
    editGroups: [TEAM_MEMBERS_ROLE],
    viewGroups: [TEAM_MEMBERS_ROLE],
    name: "Test Thread",

    ...data,
  };
  return newThread;
}
export function createThreadMessage(data?: Partial<ThreadMessage>) {
  const newThreadMessage: ThreadMessage = {
    id: nanoid(ID_LENGTH),
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
    id: nanoid(WORKSPACE_TEAM_ID_LENGTH),
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

export function createTestGroup(data?: Partial<Group>) {
  const newGroup: Group = {
    createdBy: UserId,
    id: nanoid(WORKSPACE_TEAM_ID_LENGTH),
    members: [],
    name: "Test group",
    color: BRAND_COLOR,
    ...data,
  };
  return newGroup;
}

export function createTestChannel(data?: Partial<Channel>) {
  const channel: Channel = {
    id: nanoid(ID_LENGTH),
    name: "Test Channel",
    avatar: "",
    editGroups: ["team-members"],
    viewGroups: ["team-members"],
    ...data,
  };
  return channel;
}
export function createTestRoom(data?: Partial<Room>) {
  const room: Room = {
    id: nanoid(ID_LENGTH),
    name: "Test Channel",
    avatar: "",
    editGroups: ["team-members"],
    viewGroups: ["team-members"],
    ...data,
  };
  return room;
}

export function createTestMessage(data?: Partial<Message>) {
  const message: Message = {
    id: nanoid(ID_LENGTH),
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
    groups: [],

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
