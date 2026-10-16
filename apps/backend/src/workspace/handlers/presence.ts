import type * as Party from "partykit/server";
import WorkspaceParty from "../workspace-party";
import { badRequest, ok, unauthorized } from "../../lib/http-utils";
import { PresenceRequestSchema, WORKSPACE_PRESENCE_KEY } from "@wodge/data";
import { checkMembership } from "../../lib/auth";
import { Context } from "hono";

export async function handlePresence(party: WorkspaceParty, c: Context) {
  const body = await c.req.json();

  const validatedFields = PresenceRequestSchema.safeParse(body);

  if (!validatedFields.success) {
    return badRequest();
  }

  const {
    data: { userId, connect },
  } = validatedFields;

  const isMember = checkMembership(userId, party);

  if (!isMember) {
    return unauthorized();
  }

  if (connect) {
    party.presenceMap.set(userId, true);
  } else {
    party.presenceMap.delete(userId);
  }

  await party.room.storage.put(WORKSPACE_PRESENCE_KEY, party.presenceMap);

  return ok();
}
