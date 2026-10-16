import WorkspaceParty from "../workspace-party";
import { PatcherParams, repPull } from "../../lib/replicache";
import { PatchOperation } from "replicache";
import {
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/data";
import { Context } from "hono";

export async function workspacePull(party: WorkspaceParty, c: Context) {
  const userId = c.req.header("x-user-id")!;

  return await repPull({
    req: c.req,
    storage: party.room.storage,
    versions: party.versions,
    patcher: patcher(party, userId),
  });
}

function patcher(party: WorkspaceParty, userId: string) {
  return async function ({ fromVersion }: PatcherParams) {
    const patch: PatchOperation[] = [];

    if (party.versions.get("workspaceInfo")! > fromVersion) {
      await party.poke({
        type: "workspaceInfo",
        userId,
      });
    }
    if (party.workspaceMembers.lastModifiedVersion > fromVersion) {
      patch.push({
        op: "put",
        key: makeWorkspaceMembersKey(),
        value: party.workspaceMembers.data,
      });
    }

    if (party.workspaceStructure.lastModifiedVersion > fromVersion) {
      patch.push({
        op: "put",
        key: makeWorkspaceStructureKey(),
        value: party.workspaceStructure.data,
      });
    }

    return patch;
  };
}
