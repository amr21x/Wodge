import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { UserService } from "@wodge/core/user/services/memberships";
import {
  defaultWorkspaceMembers,
  defaultWorkspaceStructure,
} from "@wodge/core/workspace/defaults";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import { WorkspaceLifecycle } from "@wodge/core/workspace/services/lifecycle";
import type { ThreadPost } from "@wodge/domain/discussions/models";
import type { PageActor } from "@wodge/domain/pages/dto";
import type { Message } from "@wodge/domain/rooms/models";
import {
  REPLICACHE_VERSIONS_KEY,
  WORKSPACE_PRESENCE_KEY,
  makeWorkspaceMembersKey,
  makeWorkspaceStructureKey,
  makeWorkspacesStoreKey,
} from "@wodge/domain/sync/index";
import type { VersionedRecord } from "@wodge/domain/sync/records";
import { createRuntimeContainer } from "../../src/container";
import type RoomParty from "../../src/servers/room";
import type ThreadParty from "../../src/servers/thread";
import type UserParty from "../../src/servers/user";
import type WorkspaceParty from "../../src/servers/workspace";
import {
  executeDiscussionMutation,
  executeRoomMutation,
  executeWorkspaceMutation,
} from "../helpers/mutations";

const record = <T>(data: T): VersionedRecord<T> => ({
  data,
  lastModifiedVersion: 0,
  deleted: false,
});

export async function featureObject(
  request: Request,
  storage: DurableObjectStorage,
) {
  const feature = new URL(request.url).searchParams.get("feature");
  const body =
    request.method === "POST"
      ? ((await request.json()) as {
          command: { name: string; args: unknown };
          version: number;
          actor: PageActor & { canView: boolean };
        })
      : undefined;
  const execution = body && {
    mutation: { ...body.command, id: 1, clientID: "client" },
    nextVersion: body.version,
    userId: body.actor.userId,
  };

  if (feature === "workspace") {
    const state = {
      workspaceMembers:
        (await storage.get<
          VersionedRecord<ReturnType<typeof defaultWorkspaceMembers>>
        >(makeWorkspaceMembersKey())) ?? record(defaultWorkspaceMembers()),
      workspaceStructure:
        (await storage.get<
          VersionedRecord<ReturnType<typeof defaultWorkspaceStructure>>
        >(makeWorkspaceStructureKey())) ?? record(defaultWorkspaceStructure()),
      versions:
        (await storage.get<Map<string, number>>(REPLICACHE_VERSIONS_KEY)) ??
        new Map([["globalVersion", 0]]),
      presenceMap:
        (await storage.get<Map<string, boolean>>(WORKSPACE_PRESENCE_KEY)) ??
        new Map<string, boolean>(),
    };
    const party = {
      ...state,
      poke: async () => {},
      name: "workspace",
      ctx: { storage: storage },
      env: {
        User: {
          idFromName: (id: string) => id,
          get: () => ({
            setName: async () => {},
            fetch: async () => ({ ok: true }),
          }),
        },
      },
    } as unknown as WorkspaceParty;

    if (body && execution) {
      if (body.command.name === "createWorkspace") {
        await new WorkspaceLifecycle(
          new WorkspaceLifecycleRepository(party.ctx.storage, party),
        ).createWorkspace(body.actor.userId);
      } else {
        await executeWorkspaceMutation(party, execution, body.actor);
      }
    }

    return Response.json({
      workspaceMembers: party.workspaceMembers,
      workspaceStructure: party.workspaceStructure,
      versions: party.versions,
      presenceMap: party.presenceMap,
    });
  }

  if (feature === "rooms") {
    const state = {
      messages:
        (await storage.get<VersionedRecord<Message[]>>("messages")) ??
        record<Message[]>([]),
    };

    if (body && execution) {
      await executeRoomMutation(
        {
          get messages() {
            return state.messages;
          },
          set messages(value) {
            state.messages = value;
          },
          name: "object",
          ctx: { storage: storage },
          env: {},
        } as unknown as RoomParty,
        execution,
        body.actor,
      );
    }

    return Response.json(state);
  }

  if (feature === "discussions") {
    const state = {
      threadPosts:
        (await storage.get<VersionedRecord<ThreadPost[]>>("posts")) ??
        record<ThreadPost[]>([]),
    };

    if (body && execution) {
      await executeDiscussionMutation(
        {
          get threadPosts() {
            return state.threadPosts;
          },
          set threadPosts(value) {
            state.threadPosts = value;
          },
          name: "object",
          ctx: { storage: storage },
          env: {},
        } as unknown as ThreadParty,
        execution,
        body.actor,
      );
    }

    return Response.json(state);
  }

  if (feature === "user") {
    const workspaces =
      (await storage.get<Set<string>>(makeWorkspacesStoreKey())) ??
      new Set<string>();
    const party = {
      workspacesStore: workspaces,
      name: "user",
      ctx: { storage: storage },
      env: {},
      poke: () => {},
    } as unknown as UserParty;
    const scope = createRuntimeContainer(party.env, {
      type: "user",
      instance: party,
    });

    try {
      const service = scope.resolve(UserService);

      if (body) {
        if (body.command.name === "addWorkspace") {
          await service.addWorkspace(body.command.args as string);
        } else {
          await service.removeWorkspace(body.command.args as string);
        }
      }

      return Response.json([...workspaces]);
    } finally {
      await scope.dispose();
    }
  }

  return new Response(null, { status: 404 });
}
