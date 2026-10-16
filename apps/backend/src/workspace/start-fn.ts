import {
  defaultWorkspaceMembers,
  defaultWorkspaceStructure,
  Invites,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
  REPLICACHE_VERSIONS_KEY,
  WORKSPACE_INVITES_KEY,
  WORKSPACE_PRESENCE_KEY,
} from "@wodge/data";
import WorkspaceParty from "./workspace-party";
import {
  PresenceMap,
  ServerWorkspaceMembers,
  ServerWorkspaceStructure,
  Versions,
} from "../types";

export async function startFn(party: WorkspaceParty) {
  const membersKey = makeWorkspaceMembersKey();
  // const metadataKey = makeWorkspaceKey();
  const structureKey = makeWorkspaceStructureKey();

  const map = await party.room.storage.get([
    membersKey,
    // metadataKey,
    structureKey,
    WORKSPACE_INVITES_KEY,
    REPLICACHE_VERSIONS_KEY,
    WORKSPACE_PRESENCE_KEY,
  ]);

  party.workspaceMembers = <ServerWorkspaceMembers>map.get(membersKey) || {
    data: { ...defaultWorkspaceMembers() },
    lastModifiedVersion: 0,
    deleted: false,
  };

  // party.workspaceMetadata = <ServerWorkspaceData>map.get(metadataKey) || {
  //   data: {},
  //   lastModifiedVersion: 0,
  //   deleted: false,
  // };

  party.workspaceStructure = <ServerWorkspaceStructure>(
    map.get(structureKey)
  ) || {
    data: { ...defaultWorkspaceStructure() },
    lastModifiedVersion: 0,
    deleted: false,
  };

  party.versions =
    <Versions>map.get(REPLICACHE_VERSIONS_KEY) ||
    new Map([
      ["globalVersion", 0],
      ["workspaceInfo", 0],
    ]);

  // remove
  // party.invites = <Invites>map.get(WORKSPACE_INVITES_KEY) || new Map();

  party.presenceMap = <PresenceMap>map.get(WORKSPACE_PRESENCE_KEY) || new Map();
}
