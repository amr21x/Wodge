import type { ThreadPost } from "@wodge/domain/discussions/models";
import type { PageRecord } from "@wodge/domain/pages/models";
import type { Message } from "@wodge/domain/rooms/models";
import type { VersionedRecord } from "@wodge/domain/sync/records";
import type { UserWorkspacesStore } from "@wodge/domain/user/models";
import type {
  Workspace,
  WorkspaceMembers,
  WorkspaceStructure,
} from "@wodge/domain/workspace/models";

export interface PageState {
  record: PageRecord;
}

export type Versions = Map<string, number>;

interface ObjectVersions {
  versions: Versions;
}

export type ServerWorkspacesStore = VersionedRecord<UserWorkspacesStore[]>;

export interface UserPartyInterface extends ObjectVersions {
  workspacesStore: Set<string>;
}

export type ServerWorkspaceData = VersionedRecord<Workspace>;

export type ServerWorkspaceMembers = VersionedRecord<WorkspaceMembers>;

export type ServerWorkspaceStructure = VersionedRecord<WorkspaceStructure>;

export type PresenceMap = Map<string, boolean>;

export interface WorkspacePartyInterface extends ObjectVersions {
  workspaceMembers: ServerWorkspaceMembers;
  workspaceStructure: ServerWorkspaceStructure;
  presenceMap: PresenceMap;
}

export type ServerThreadMessages = VersionedRecord<ThreadPost[]>;

export type ServerRoomMessages = VersionedRecord<Message[]>;

export interface RoomPartyInterface extends ObjectVersions {
  messages: ServerRoomMessages;
}

export interface ThreadPartyInterface extends ObjectVersions {
  threadPosts: ServerThreadMessages;
}

export interface PagePartyInterface extends ObjectVersions {
  state: PageState;
}
