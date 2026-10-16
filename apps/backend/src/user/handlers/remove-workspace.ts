import type * as Party from "partykit/server";
import UserParty from "../user-party";
import { badRequest, ok } from "../../lib/http-utils";
import {
  REPLICACHE_VERSIONS_KEY,
  UserWorkspacesStore,
  makeWorkspacesStoreKey,
} from "@wodge/data";
import { Context } from "hono";

export async function removeWorkspace(party: UserParty, c: Context) {
  const { workspaceId } = <{ workspaceId: string }>await c.req.json();

  if (!workspaceId) return badRequest();

  party.workspacesStore.delete(workspaceId);

  // Persist data
  await party.room.storage.put({
    [makeWorkspacesStoreKey()]: party.workspacesStore,
  });

  // Poke update data
  party.poke({ type: "deleteWorkspace", id: workspaceId });

  return ok();
}
