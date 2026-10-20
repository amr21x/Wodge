import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import { RoomRecordRepository } from "@wodge/core/rooms/repositories/records";
import { DiscussionRecordRepository } from "@wodge/core/discussions/repositories/records";
import { UserRecordRepository } from "@wodge/core/user/repositories/records";
import type { DurableObjectStorage } from "@cloudflare/workers-types";
import { UserService } from "@wodge/core/user/services/memberships";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import { WorkspaceLifecycle } from "@wodge/core/workspace/services/lifecycle";
import type { PageActor } from "@wodge/domain/pages/dto";
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
    const state = await new WorkspaceRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "workspace",
      ),
    ).loadWorkspace();
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
          new WorkspaceLifecycleRepository(
            new WorkspaceRecordRepository(
              party.ctx.storage,
              createObjectDatabase(party.ctx.storage),
              new ObjectSyncRepository(
                party.ctx.storage,
                createObjectDatabase(party.ctx.storage),
                "workspace",
              ),
            ),
            new ObjectSyncRepository(
              party.ctx.storage,
              createObjectDatabase(party.ctx.storage),
              "workspace",
            ),
            party,
            createObjectDatabase(party.ctx.storage),
          ),
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
    const state = await new RoomRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(storage, createObjectDatabase(storage), "room"),
    ).loadRoom();

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
    const state = await new DiscussionRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(
        storage,
        createObjectDatabase(storage),
        "thread",
      ),
    ).loadThread();

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
    const { workspacesStore: workspaces } = await new UserRecordRepository(
      storage,
      createObjectDatabase(storage),
      new ObjectSyncRepository(storage, createObjectDatabase(storage), "user"),
    ).loadUser();
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
