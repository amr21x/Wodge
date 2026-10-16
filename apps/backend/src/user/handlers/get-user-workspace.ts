import type * as Party from "partykit/server";
import UserParty from "../user-party";
import { badRequest, json } from "../../lib/http-utils";
import { Workspace } from "@wodge/data";
import { Context } from "hono";

export async function getUserWorkspaces(party: UserParty, c: Context) {
  const userId = c.req.header("x-user-id");

  // Todo read the user workspaces from db binding instead

  const res = await fetch(`${party.room.env.AUTH_DOMAIN}/api/user-workspaces`, {
    headers: {
      // Accept: "application/json",
      authorization: party.room.env.SECRET_KEY as string,
      "x-user-id": userId as string,
    },
  });

  if (!res.ok) return badRequest();

  const workspaces = (await res.json()) as Workspace[];

  return json(workspaces);
}
