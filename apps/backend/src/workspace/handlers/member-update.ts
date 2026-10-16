import { Context } from "hono";
import WorkspaceParty from "../workspace-party";
import { makeWorkspaceMembersKey } from "@wodge/data";
import { ok, unauthorized } from "../../lib/http-utils";
import { produce } from "immer";

export async function memberUpdateHandler(party: WorkspaceParty, c: Context) {
  const nextVersion = party.versions.get("globalVersion")! + 1;

  party.workspaceMembers = produce(party.workspaceMembers, (draft) => {
    draft.lastModifiedVersion = nextVersion;
  });

  party.versions.set("globalVersion", nextVersion);

  await party.room.storage.put({
    [makeWorkspaceMembersKey()]: party.workspaceMembers,
    REPLICACHE_VERSIONS_KEY: party.versions,
  });

  await party.poke({
    type: "workspaceMembers",
  });

  return ok();
}
