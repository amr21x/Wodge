import { Request } from "partykit/server";
import UserParty from "../user-party";
import { RunnerParams, repPush } from "../../lib/replicache";
import { NewWorkspaceSchema } from "@wodge/data";
import { makeWorkspacesStoreKey } from "@wodge/data";
import { Context } from "hono";

export async function userPush(party: UserParty, c: Context) {
  const res = await repPush({
    req: c.req,
    storage: party.room.storage,
    versions: party.versions,
    runner: runner(party),
  });

  if (res.status === 200) {
    party.poke();
  }

  return res;
}

function runner(party: UserParty) {
  return async ({ mutation, nextVersion }: RunnerParams) => {
    const { storage } = party.room;
    const { workspacesStore } = party;
    switch (mutation.name) {
    }
  };
}
