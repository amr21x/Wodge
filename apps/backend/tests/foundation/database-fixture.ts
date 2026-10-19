import type { D1Database } from "@cloudflare/workers-types";
import { BetterAuthMembership } from "@wodge/auth/membership";
import { createAuth } from "@wodge/auth/server";
import { UserRepository } from "@wodge/core/user/repositories/profiles";
import { AccountService } from "@wodge/core/user/services/account";
import { WorkspaceRepository } from "@wodge/core/workspace/repositories/directory";
import { OrganizationRepository } from "@wodge/core/workspace/repositories/organizations";
import { WorkspaceDirectory } from "@wodge/core/workspace/services/directory";
import { WorkspaceManagement } from "@wodge/core/workspace/services/management";
import { createDatabase } from "@wodge/infra/database/database";
import { createTestEnvironment } from "../helpers/environment";

export interface DatabaseBindings {
  DB: D1Database;
}

export function createDatabaseFixture(env: DatabaseBindings) {
  const environment = createTestEnvironment(env);
  const database = createDatabase(environment);
  const users = new AccountService(new UserRepository(database));
  const workspaces = new WorkspaceRepository(database);
  const auth = createAuth(environment, database, { send: async () => {} });
  const identity = new BetterAuthMembership(
    new OrganizationRepository(database),
    auth,
  );
  const directory = new WorkspaceDirectory(workspaces, users);
  const management = new WorkspaceManagement(workspaces);
  return {
    auth,
    users,
    workspaces,
    directory,
    management,
    identity,
    dispose: () => {},
  };
}
