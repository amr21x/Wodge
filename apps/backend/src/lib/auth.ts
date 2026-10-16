/**
 * Credits to partykit nextjs chat template
 */
import type * as Party from "partykit/server";
import { badRequest, error, getRoute, ok, unauthorized } from "./http-utils";
import WorkspaceParty from "../workspace/workspace-party";
import { AuthChannelResponse } from "../workspace/handlers/auth-channel";
import { ChannelsTypes } from "@wodge/domain/channels";
import { UserType } from "@wodge/data";
import * as jose from "jose";
import queryString from "query-string";
/**
 * Referenced from user client model
 */
export type Session = {
  sessionToken: string;
  userId: string;
  expires: string;
  user: {
    id: string;
    username: string;
  };
};

/**
 * Check if a session is valid by checking if it exists and if it has expired
 */
export const isSessionValid = (
  session?: Session | null
): session is Session => {
  return Boolean(
    session && (!session.expires || session.expires > new Date().toISOString())
  );
};

/**
 * Edge network version
 */
export const checkMembershipEdge = async (
  userId: string,
  lobby: Party.Lobby
) => {
  // 1. Get the party instance
  const workspaceParty = lobby.parties.workspace;

  if (!workspaceParty) return false;

  // 2. Get the workspace instance
  const workspace = workspaceParty.get(lobby.id);

  if (!workspace) return false;

  // 3. Get the current user membership
  const res = await workspace.fetch("/service/membership", {
    headers: {
      authorization: lobby.env.SECRET_KEY as string,
      "x-user-id": userId,
    },
  });

  const data = await res.json();

  //@ts-ignore
  return !!data?.success;
};

/**
 * Normal version
 */
export const checkMembership = (userId: string, party: WorkspaceParty) => {
  return (
    party.workspaceMembers.data.createdBy === userId ||
    party.workspaceMembers.data.members.some((m) => m.id === userId)
  );
};

export const authorizeChannel = async (
  req: Party.Request,
  lobby: Party.Lobby,
  userId: string,
  type: ChannelsTypes,
  obj?: { folderId: string; teamId: string; workspaceId: string }
) => {
  const workspaceId = obj?.workspaceId ?? req.headers.get("x-workspace-id");
  const teamId = obj?.teamId ?? req.headers.get("x-team-id");
  const folderId = obj?.folderId ?? req.headers.get("x-folder-id");

  if (!workspaceId || !teamId) return badRequest();

  const workspaceParty = lobby.parties.workspace?.get(workspaceId);

  if (!workspaceParty) return badRequest();

  if (!userId) return unauthorized();

  if (!teamId) return unauthorized();

  if (type === "page" && !folderId) return badRequest();

  const res = await workspaceParty.fetch("/service/auth-channel", {
    headers: {
      //@ts-ignore
      "x-workspace-id": workspaceId,
      "x-team-id": teamId,
      "x-user-id": userId,
      "x-channel-id": lobby.id,
      "x-channel-type": type,
      authorization: lobby.env.SECRET_KEY as string,
      ...(type === "page" && { "x-folder-id": folderId }),
    },
  });

  if (res.status !== 200) return unauthorized();

  const body = (await res.json()) as AuthChannelResponse;

  if (!body.success) return unauthorized();

  req.headers.set("channel-auth", JSON.stringify(body));

  req.headers.set("x-admin", body.isAdmin ? "true" : "false");
  req.headers.set("x-can-edit", body.canEdit ? "true" : "false");
  req.headers.set("x-can-view", body.canView ? "true" : "false");
  req.headers.set("x-owner", body.isOwner ? "true" : "false");
  req.headers.set("x-team-moderator", body.isOwner ? "true" : "false");

  return req;
};

export const verify = async (req: Party.Request, lobby: Party.Lobby) => {
  //verify jwt
  const token = req.headers.get("authorization");

  //Todo return to false
  if (!token) return false;
  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(lobby.env.SECRET_KEY as string)
    );

    if (payload.exp && payload.exp < Date.now() / 1000) return false;

    return true;
  } catch {
    return false;
  }
};

export const verifyToken = async (req: Party.Request, lobby: Party.Lobby) => {
  let token = queryString.parseUrl(req.url).query?.token;

  if (!token || typeof token !== "string") {
    token = req.headers.get("authorization");

    if (!token) {
      return;
    }
  }

  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(lobby.env.SECRET_KEY as string)
    );

    if (payload.exp && payload.exp < Date.now() / 1000) {
      return;
    }

    return payload;
  } catch (e) {
    return;
  }
};
