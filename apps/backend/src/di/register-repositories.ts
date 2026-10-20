import { ObjectSyncRepository } from "@wodge/core/sync/repositories/state";
import { PollRepository } from "@wodge/core/polls/repositories/polls";
import { PageDocumentRepository } from "@wodge/core/pages/repositories/document";
import { FeatureFlagRepository } from "@wodge/core/features/repositories/flags";
import { SubscriptionRepository } from "@wodge/core/billing/repositories/subscriptions";
import { AuthorizationRepository } from "@wodge/core/authorization/repositories/policy";
import { DiscussionRepository } from "@wodge/core/discussions/repositories/posts";
import { DiscussionRecordRepository } from "@wodge/core/discussions/repositories/records";
import { PageRepository } from "@wodge/core/pages/repositories/page";
import { PageRecordRepository } from "@wodge/core/pages/repositories/records";
import { RoomRepository } from "@wodge/core/rooms/repositories/messages";
import { RoomRecordRepository } from "@wodge/core/rooms/repositories/records";
import { UserRepository } from "@wodge/core/user/repositories/profiles";
import { UserRecordRepository } from "@wodge/core/user/repositories/records";
import { SessionRepository } from "@wodge/core/user/repositories/sessions";
import { UserWorkspaceRepository } from "@wodge/core/user/repositories/workspaces";
import { WorkspaceRepository } from "@wodge/core/workspace/repositories/directory";
import { WorkspaceFileRepository } from "@wodge/core/workspace/repositories/files";
import { WorkspaceLifecycleRepository } from "@wodge/core/workspace/repositories/lifecycle";
import { OrganizationRepository } from "@wodge/core/workspace/repositories/organizations";
import { WorkspaceRecordRepository } from "@wodge/core/workspace/repositories/records";
import { WorkspaceStateRepository } from "@wodge/core/workspace/repositories/state";
import { Lifecycle, type DependencyContainer } from "tsyringe";

// Lifetimes are declared here, never as module-import side effects in the classes.
export function registerRepositories(container: DependencyContainer) {
  container.register(
    ObjectSyncRepository,
    { useClass: ObjectSyncRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PollRepository,
    { useClass: PollRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PageDocumentRepository,
    { useClass: PageDocumentRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    FeatureFlagRepository,
    { useClass: FeatureFlagRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    SubscriptionRepository,
    { useClass: SubscriptionRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AuthorizationRepository,
    { useClass: AuthorizationRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    DiscussionRepository,
    { useClass: DiscussionRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    DiscussionRecordRepository,
    { useClass: DiscussionRecordRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PageRepository,
    { useClass: PageRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PageRecordRepository,
    { useClass: PageRecordRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoomRepository,
    { useClass: RoomRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoomRecordRepository,
    { useClass: RoomRecordRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    UserRepository,
    { useClass: UserRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    UserRecordRepository,
    { useClass: UserRecordRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    SessionRepository,
    { useClass: SessionRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    UserWorkspaceRepository,
    { useClass: UserWorkspaceRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceRepository,
    { useClass: WorkspaceRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceFileRepository,
    { useClass: WorkspaceFileRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceLifecycleRepository,
    { useClass: WorkspaceLifecycleRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    OrganizationRepository,
    { useClass: OrganizationRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceRecordRepository,
    { useClass: WorkspaceRecordRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceStateRepository,
    { useClass: WorkspaceStateRepository },
    { lifecycle: Lifecycle.ContainerScoped },
  );
}
