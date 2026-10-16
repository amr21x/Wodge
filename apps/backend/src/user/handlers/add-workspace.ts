import type * as Party from "partykit/server";
import UserParty from "../user-party";
import { badRequest, ok } from "../../lib/http-utils";
import {
  REPLICACHE_VERSIONS_KEY,
  UserWorkspacesStore,
  makeWorkspacesStoreKey,
} from "@wodge/data";
import { produce } from "immer";
import { Context } from "hono";

export async function addWorkspace(party: UserParty, c: Context) {
  const workspaceId = c.req.header("workspaceId");
  if (!workspaceId) return badRequest();

  party.workspacesStore.add(workspaceId);

  // Persist data
  await party.room.storage.put({
    [makeWorkspacesStoreKey()]: party.workspacesStore,
  });

  // Account for joining cases
  // party.poke({ type: "workspaceInfo" });

  return ok();
}
