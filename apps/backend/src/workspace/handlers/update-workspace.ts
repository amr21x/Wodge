import type * as Party from "partykit/server";
import WorkspaceParty from "../workspace-party";
import { REPLICACHE_VERSIONS_KEY, WorkspaceSchema } from "@wodge/data";
import { badRequest, ok } from "../../lib/http-utils";
import { Context } from "hono";

export async function updateWorkspace(party: WorkspaceParty, c: Context) {
  await party.poke();

  const nextVersion = party.versions.get("globalVersion")! + 1;

  party.versions.set("workspaceInfo", nextVersion);
  party.versions.set("globalVersion", nextVersion);

  await party.room.storage.put(REPLICACHE_VERSIONS_KEY, party.versions);
  return ok();
}
