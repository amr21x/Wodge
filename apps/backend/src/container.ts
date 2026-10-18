// Load reflection support before TSyringe and the registration modules are evaluated.
import "reflect-metadata";
import type { DependencyContainer } from "tsyringe";
import { container as rootContainer } from "tsyringe";
import { registerServices } from "./di/register-services";
import { registerRepositories } from "./di/register-repositories";
import { registerTransport } from "./di/register-transport";
import { registerIntegrationClasses } from "./di/register-providers";
import { registerAdapters } from "./di/adapters";
import { registerProviders } from "./di/providers";
import type { ObjectContext } from "./types/object-context";
import type { WorkerEnvironment } from "./types/worker-environment";

// Registrations are shared; each runtime owner has its own cache of constructed instances.
registerServices(rootContainer);
registerRepositories(rootContainer);
registerTransport(rootContainer);
registerIntegrationClasses(rootContainer);
registerProviders(rootContainer);
registerAdapters(rootContainer);

/** One container per Worker environment or Durable Object activation. Never per request. */
export function createRuntimeContainer(
  environment: WorkerEnvironment,
  object?: ObjectContext,
): DependencyContainer {
  const container = rootContainer.createChildContainer();
  container.registerInstance("environment", environment);
  if (object) {
    container.registerInstance("storage", object.instance.ctx.storage);
    container.registerInstance("objectId", object.instance.name);
    container.registerInstance(object.type, object.instance);
  }
  return container;
}
