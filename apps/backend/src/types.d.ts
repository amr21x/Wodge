import {
  Invite,
  Invites,
  UserWorkspacesStore,
  WorkspaceMembers,
  WorkspaceStructure,
  Workspace,
  Comment,
  ThreadMessage,
  Message,
  Board,
  ThreadPost,
} from "@wodge/data";
import { Db } from "@wodge/domain/pages";
import WorkspaceParty from "./workspace/workspace-party";

/**
 * General
 */
interface Party {
  versions: Versions;
}

interface ReplicacheFields {
  lastModifiedVersion: number;
  deleted: boolean;
}

export type Versions = Map<string, number>;

/**
 * User
 */
export type ServerWorkspacesStore = {
  data: UserWorkspacesStore[];
} & ReplicacheFields;

export interface UserPartyInterface extends Party {
  workspacesStore: Set<string>;
}

/**
 * Workspace
 */
export type ServerWorkspaceData = { data: Workspace } & ReplicacheFields;

export type ServerWorkspaceMembers = {
  data: WorkspaceMembers;
} & ReplicacheFields;

export type ServerWorkspaceStructure = {
  data: WorkspaceStructure;
} & ReplicacheFields;

export type PresenceMap = Map<string, boolean>;
export interface WorkspacePartyInterface extends Party {
  // workspaceMetadata: ServerWorkspaceData;
  workspaceMembers: ServerWorkspaceMembers;
  workspaceStructure: ServerWorkspaceStructure;
  presenceMap: PresenceMap;
}

export interface ServerThreadMessages extends ReplicacheFields {
  data: ThreadPost[];
}

export interface ServerPageDB extends ReplicacheFields {
  data: Db;
}

export interface ServerRoomMessages extends ReplicacheFields {
  data: Message[];
}

export interface RoomPartyInterface extends Party {
  messages: ServerRoomMessages;
}

export interface ThreadPartyInterface extends Party {
  threadPosts: ServerThreadMessages;
}

export interface PagePartyInterface extends Party {
  db: ServerPageDB;
}
