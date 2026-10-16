import { Request } from "partykit/server";
import UserParty from "../user-party";
import { PatcherParams, repPull } from "../../lib/replicache";
import { PatchOperation } from "replicache";
import { makeWorkspacesStoreKey } from "@wodge/data";
import { Context } from "hono";

export async function userPull(party: UserParty, c: Context) {
  return await repPull({
    req: c.req,
    storage: party.room.storage,
    versions: party.versions,
    patcher: patcher(party),
  });
}

function patcher(party: UserParty) {
  return async function ({ fromVersion }: PatcherParams) {
    const { workspacesStore } = party;

    const patch: PatchOperation[] = [];

    // if (workspacesStore)
    //   if (workspacesStore.lastModifiedVersion > fromVersion) {
    //     patch.push({
    //       op: "put",
    //       key: makeWorkspacesStoreKey(),
    //       value: workspacesStore.data,
    //     });
    //   }

    return patch;
  };
}
