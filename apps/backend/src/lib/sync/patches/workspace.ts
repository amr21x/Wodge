import {
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
} from "@wodge/domain/sync/index";
import { PatchOperation } from "replicache";
import type { UserGateway } from "../../../gateways/user";
import WorkspaceServer from "../../../servers/workspace";
import { PatcherParams } from "../replicache";

export function createWorkspacePatch(
  party: WorkspaceServer,
  userId: string,
  gateway: UserGateway,
) {
  return async function ({ fromVersion }: PatcherParams) {
    const patch: PatchOperation[] = [];

    if (party.versions.get("workspaceInfo")! > fromVersion) {
      await party.poke(
        {
          type: "workspaceInfo",
          userId,
        },
        gateway,
      );
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
