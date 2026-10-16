import type * as Party from "partykit/server";
import UserParty from "../user-party";
import { ok, unauthorized } from "../../lib/http-utils";
import { PokeMessage } from "@wodge/data";
import { Context } from "hono";

export async function poke(party: UserParty, c: Context) {
  const body = <PokeMessage>await c.req.json();

  party.poke(body);

  return ok();
}
