import { AuthorizationRetry } from "@wodge/infra/durable-objects/authorization-retry";
import { HttpClient } from "@wodge/infra/http/client";
import { PolarPayments } from "@wodge/infra/payments/polar";
import { S3ObjectStorage } from "@wodge/infra/storage/object-storage";
import { Lifecycle, type DependencyContainer } from "tsyringe";

// Lifetimes are declared here, never as module-import side effects in the classes.
export function registerIntegrationClasses(container: DependencyContainer) {
  container.register(
    AuthorizationRetry,
    { useClass: AuthorizationRetry },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    HttpClient,
    { useClass: HttpClient },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PolarPayments,
    { useClass: PolarPayments },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    S3ObjectStorage,
    { useClass: S3ObjectStorage },
    { lifecycle: Lifecycle.ContainerScoped },
  );
}
