import "reflect-metadata";
import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { PageRecordRepository } from "@wodge/core/pages/repositories/records";
import { toUserProfile } from "@wodge/core/user/profile";
import { authOrganizations, authUsers } from "@wodge/domain/auth/schema/d1";
import { createTestEnvironment } from "../helpers/environment";
// Local compatibility fixture, separate from the production router.
import type { DurableObjectNamespace } from "@cloudflare/workers-types";
import type { PageActor } from "@wodge/domain/pages/dto";
import {
  NewWorkspaceSchema,
  WorkspaceSchema,
} from "@wodge/domain/workspace/validation";
import { createDatabase as createDb } from "@wodge/infra/database/database";
import { Server } from "partyserver";
import { YServer } from "y-partyserver";
import { z } from "zod";
import type PageParty from "../../src/servers/page";
import { executePageMutation } from "../helpers/mutations";
import { featureObject } from "./feature-objects";
import {
  createDatabaseFixture,
  type DatabaseBindings,
} from "./database-fixture";

// Test-only object: reconstruct the core service from persisted state per request.

export class FoundationRoom extends Server {
  async onRequest(request: Request) {
    if (new URL(request.url).pathname === "/feature-commands") {
      return featureObject(request, this.ctx.storage);
    }

    const { state } = await new PageRecordRepository(
      this.ctx.storage,
      createObjectDatabase(this.ctx.storage),
      new ObjectSyncRepository(
        this.ctx.storage,
        createObjectDatabase(this.ctx.storage),
        "page",
      ),
    ).loadPage();

    if (request.method === "POST") {
      const { command, actor, version } = (await request.json()) as {
        command: { name: string; args: unknown };
        actor: PageActor;
        version: number;
      };

      await executePageMutation(
        {
          state,
          name: "fixture",
          ctx: { storage: this.ctx.storage },
          env: {},
        } as unknown as PageParty,
        {
          mutation: { ...command, id: 1, clientID: "client" },
          nextVersion: version,
          userId: actor.userId,
        },
        { ...actor, canView: true },
      );
    }

    return Response.json(state.record);
  }
}

export class FoundationPage extends YServer {}

const UserId = z.string().min(1);

interface FoundationBindings extends DatabaseBindings {
  FOUNDATION_ROOMS: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: FoundationBindings) {
    const fixture = createDatabaseFixture(env);

    try {
      const url = new URL(request.url);

      if (
        url.pathname === "/page-commands" ||
        url.pathname === "/feature-commands"
      ) {
        const id = env.FOUNDATION_ROOMS.idFromName(
          (url.searchParams.get("feature") ?? "pages") +
            ":" +
            (url.searchParams.get("id") ?? "page-service"),
        );

        return env.FOUNDATION_ROOMS.get(id).fetch(request.url, {
          method: request.method,
          body: request.method === "POST" ? await request.text() : undefined,
        });
      }

      if (url.pathname === "/imports") {
        return Response.json({
          workspaceSchema: WorkspaceSchema.safeParse({}).success,
          newWorkspace: NewWorkspaceSchema.safeParse({
            name: "Test",
            slug: "test",
          }).success,
          database: typeof createDb(createTestEnvironment(env)).select,
        });
      }

      if (url.pathname === "/entity-identifiers") {
        const db = createDb(createTestEnvironment(env));
        const storedUser = await db
          .insert(authUsers)
          .values({
            name: "UUID user",
            email: "uuid-default@example.test",
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning()
          .get();
        const user = toUserProfile(storedUser);
        const workspace = await db
          .insert(authOrganizations)
          .values({
            createdAt: new Date(),
            name: "UUID workspace",
            slug: "uuid-workspace",
          })
          .returning()
          .get();

        return Response.json({
          user,
          workspace: { ...workspace, owner: user.id },
          reloaded: await fixture.users.getUserById(user.id),
          legacy: await fixture.users.getUserById("foundation-owner"),
        });
      }

      if (url.pathname === "/workspace-directory") {
        const workspaceId = UserId.parse(url.searchParams.get("id"));

        if (request.method === "POST") {
          return Response.json(
            await fixture.directory.rotateInvite(
              "foundation-owner",
              workspaceId,
            ),
          );
        }

        if (request.method === "PATCH") {
          await fixture.directory.toggleInvite(workspaceId);

          return new Response(null, { status: 200 });
        }

        return Response.json({
          preview: await fixture.management.preview(
            workspaceId,
            UserId.parse(url.searchParams.get("token")),
            "foundation-owner",
          ),
          membership: await fixture.workspaces.getMembership(
            "foundation-owner",
            workspaceId,
          ),
          members: await fixture.workspaces.getMemberIds(workspaceId),
          invites: await fixture.workspaces.getInvites(workspaceId),
        });
      }

      if (url.pathname === "/workspace" && request.method === "POST") {
        const workspace = WorkspaceSchema.required({ id: true }).parse(
          await request.json(),
        );

        const organization = await fixture.auth.api.createOrganization({
          body: {
            userId: workspace.owner,
            name: workspace.name,
            slug: workspace.slug,
          },
        });
        return Response.json({
          workspace: await fixture.workspaces.getWorkspaceById(organization.id),
        });
      }

      if (url.pathname === "/workspaces") {
        const id = UserId.parse(url.searchParams.get("id"));

        return Response.json(
          await fixture.workspaces.getWorkspacesByUserId(id),
        );
      }

      if (url.pathname === "/user") {
        const id = UserId.parse(url.searchParams.get("id"));
        const user = await fixture.users.getUserById(id);

        return Response.json(user ?? null);
      }

      return new Response(null, { status: 404 });
    } finally {
      await fixture.dispose();
    }
  },
};
