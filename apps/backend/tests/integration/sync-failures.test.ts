import { roomAuthorizationFixture } from "../helpers/authorization";
// @vitest-environment node
import { ThreadPostSchema } from "@wodge/domain/discussions/validation";
import { MessageSchema } from "@wodge/domain/rooms/validation";
import {
  makeClientGroupKey,
  makeClientKey,
  makeWorkspaceStructureKey,
} from "@wodge/domain/sync/index";
import { expect, test, vi } from "vitest";
import type RoomParty from "../../src/servers/room";
import type ThreadParty from "../../src/servers/thread";
import type WorkspaceParty from "../../src/servers/workspace";
import {
  roomBindings,
  threadBindings,
  workspaceBindings,
} from "../helpers/bindings";
import {
  discussionsRoutes,
  roomsRoutes,
  workspaceRoutes,
} from "../helpers/routes";

vi.mock("@wodge/auth/membership", () => ({
  BetterAuthMembership: class {
    async hasMember() {
      return true;
    }
  },
}));

const scenarios = [
  {
    feature: "workspace",
    name: "createTeam",
    args: { id: "second-team-1234", name: "Second" },
    key: makeWorkspaceStructureKey(),
  },
  {
    feature: "rooms",
    name: "sendMessage",
    args: MessageSchema.parse({
      id: "message",
      sender: "owner",
      content: "Hello",
      date: "2026-10-16T00:00:00.000Z",
    }),
    key: "messages",
  },
  {
    feature: "discussions",
    name: "createPost",
    args: ThreadPostSchema.parse({
      id: "post",
      author: "owner",
      content: "Question",
      type: "qa",
      createdAt: "2026-10-16T00:00:00.000Z",
    }),
    key: "posts",
  },
];

function fixture(scenario: (typeof scenarios)[number]) {
  const records = new Map<string, unknown>();
  const poke = vi.fn(async () => new Response());
  const put = vi.fn(
    async (key: string | Record<string, unknown>, value?: unknown) => {
      if (key === scenario.key) {
        throw new Error("write failed");
      }

      for (const [name, data] of typeof key === "string"
        ? [[key, value]]
        : Object.entries(key)) {
        records.set(name as string, structuredClone(data));
      }
    },
  );
  const party = {
    authorization: roomAuthorizationFixture("resource"),
    workspaceMembers: {
      data: { createdBy: "owner", members: [{ id: "owner", role: "owner" }] },
      lastModifiedVersion: 0,
      deleted: false,
    },
    workspaceStructure: {
      data: { teams: [], groups: [] },
      lastModifiedVersion: 0,
      deleted: false,
    },
    messages: { data: [], lastModifiedVersion: 0, deleted: false },
    threadPosts: { data: [], lastModifiedVersion: 0, deleted: false },
    versions: new Map([["globalVersion", 0]]),
    poke,
    name: "resource",
    ctx: {
      storage: {
        get: async (key: string) => structuredClone(records.get(key)),
        put,
      },
    },
    env: {
      ...{ SECRET_KEY: "local-only" },
      Workspace: {
        idFromName: (id: string) => id,
        get: () => ({ setName: async () => {}, fetch: poke }),
      },
    },
  };
  const request = (init: RequestInit) =>
    scenario.feature === "workspace"
      ? workspaceRoutes.request(
          "http://localhost/parties/workspace/resource/replicache-push",
          init,
          workspaceBindings(party as unknown as WorkspaceParty),
        )
      : scenario.feature === "rooms"
        ? roomsRoutes.request(
            "http://localhost/parties/room/resource/replicache-push",
            init,
            roomBindings(party as unknown as RoomParty),
          )
        : discussionsRoutes.request(
            "http://localhost/parties/thread/resource/replicache-push",
            init,
            threadBindings(party as unknown as ThreadParty),
          );
  const push = (name = scenario.name) =>
    request({
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-user-id": "owner",
        "x-session-id": "session",
        "x-workspace-id": "workspace",
        "x-owner": "true",
      },
      body: JSON.stringify({
        clientGroupID: "group",
        mutations: [{ id: 1, clientID: "client", name, args: scenario.args }],
      }),
    });

  return { party, records, poke, push };
}

test.each(scenarios)(
  "$feature retains acknowledgement after a known operation's storage failure",
  async (scenario) => {
    const f = fixture(scenario);

    expect((await f.push()).status).toBe(200);
    expect(f.records.has(scenario.key)).toBe(false);
    expect(
      f.records.get(makeClientKey("client", makeClientGroupKey("group"))),
    ).toMatchObject({ lastMutationID: 1 });
    expect(f.party.versions.get("globalVersion")).toBe(1);
    expect(f.poke).toHaveBeenCalledOnce();
    const state =
      scenario.feature === "workspace"
        ? f.party.workspaceStructure
        : scenario.feature === "rooms"
          ? f.party.messages
          : f.party.threadPosts;

    expect(state.lastModifiedVersion).toBe(1);
  },
);

test.each(scenarios)(
  "$feature retains its unknown-command response contract",
  async (scenario) => {
    const f = fixture(scenario);

    expect((await f.push("unknown")).status).toBe(
      scenario.feature === "workspace" ? 500 : 200,
    );
    expect(f.party.versions.get("globalVersion")).toBe(
      scenario.feature === "workspace" ? 0 : 1,
    );
  },
);
