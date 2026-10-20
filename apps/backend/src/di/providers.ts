import { createObjectDatabase } from "@wodge/infra/database/object-database";
import { createAuth } from "@wodge/auth/server";
import { createDatabase } from "@wodge/infra/database/database";
import type { Database } from "@wodge/infra/database/types";
import {
  instancePerContainerCachingFactory,
  type DependencyContainer,
} from "tsyringe";
import type { WorkerEnvironment } from "../types/worker-environment";

/** Register once. Factories are lazy and cache within the owning runtime container. */
export function registerProviders(container: DependencyContainer) {
  container.register("objectDatabase", {
    useFactory: instancePerContainerCachingFactory((c) =>
      createObjectDatabase(c.resolve<DurableObjectStorage>("storage")),
    ),
  });
  container.register("database", {
    useFactory: instancePerContainerCachingFactory((c) =>
      createDatabase(c.resolve<WorkerEnvironment>("environment")),
    ),
  });
  container.register("auth", {
    useFactory: instancePerContainerCachingFactory((c) =>
      createAuth(
        c.resolve<WorkerEnvironment>("environment"),
        c.resolve<Database>("database"),
      ),
    ),
  });
}
