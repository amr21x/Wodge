// Local compatibility fixture, separate from the production router.
import { Server } from "partyserver";
import { YServer } from "y-partyserver";
import { betterAuth, mcp, drizzleAdapter, z } from "@wodge/backend-protocol";
import { NewWorkspaceSchema, WorkspaceSchema } from "@wodge/data";
import { createDb } from "@wodge/data/server";
import {
  createBackendData,
  type DataBindings,
} from "../../src/lib/data-server";

export class FoundationRoom extends Server {}
export class FoundationPage extends YServer {}

const UserId = z.string().min(1);

export default {
  async fetch(request: Request, env: DataBindings) {
    const url = new URL(request.url);
    if (url.pathname === "/imports") {
      return Response.json({
        betterAuth: typeof betterAuth,
        mcp: typeof mcp,
        drizzleAdapter: typeof drizzleAdapter,
        workspaceSchema: WorkspaceSchema.safeParse({}).success,
        newWorkspace: NewWorkspaceSchema.safeParse({
          name: "Test",
          slug: "test",
        }).success,
        database: typeof createDb(env.DB).select,
      });
    }
    if (url.pathname === "/workspace" && request.method === "POST") {
      const workspace = WorkspaceSchema.required({ id: true }).parse(
        await request.json(),
      );
      return Response.json(
        await createBackendData(env).createWorkspace(workspace),
      );
    }
    if (url.pathname === "/workspaces") {
      const id = UserId.parse(url.searchParams.get("id"));
      return Response.json(
        await createBackendData(env).getWorkspacesByUserId(id),
      );
    }
    if (url.pathname === "/user") {
      const id = UserId.parse(url.searchParams.get("id"));
      const user = await createBackendData(env).getUserById(id);
      return Response.json(user ?? null);
    }
    return new Response(null, { status: 404 });
  },
};
