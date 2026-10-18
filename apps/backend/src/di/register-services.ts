import { BillingService } from "@wodge/core/billing/services/billing";
import { DiscussionService } from "@wodge/core/discussions/services/posts";
import { PageService } from "@wodge/core/pages/services/page";
import { RoomService } from "@wodge/core/rooms/services/messages";
import { AccountService } from "@wodge/core/user/services/account";
import { UserAvatars } from "@wodge/core/user/services/avatars";
import { UserService } from "@wodge/core/user/services/memberships";
import { WorkspaceDirectory } from "@wodge/core/workspace/services/directory";
import { WorkspaceFiles } from "@wodge/core/workspace/services/files";
import { WorkspaceLifecycle } from "@wodge/core/workspace/services/lifecycle";
import { WorkspaceManagement } from "@wodge/core/workspace/services/management";
import { WorkspaceService } from "@wodge/core/workspace/services/structure";
import { ResourceGrantCache } from "@wodge/auth/authorization/grants";
import { AuthorizationPolicies } from "@wodge/auth/authorization/policies";
import { AuthorizationRevocations } from "@wodge/auth/authorization/revocations";
import { RoomScope } from "@wodge/auth/authorization/room-scope";
import { WorkspaceAuthorization } from "@wodge/auth/authorization/service";
import { WorkspaceAccess } from "@wodge/auth/authorization/workspace-access";
import { WorkspaceMutationAccess } from "@wodge/auth/authorization/workspace-mutations";
import { BetterAuthMembership } from "@wodge/auth/membership";
import { SessionTickets } from "@wodge/auth/tickets";
import { Lifecycle, type DependencyContainer } from "tsyringe";

// Lifetimes are declared here, never as module-import side effects in the classes.
export function registerServices(container: DependencyContainer) {
  container.register(
    BillingService,
    { useClass: BillingService },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    DiscussionService,
    { useClass: DiscussionService },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PageService,
    { useClass: PageService },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoomService,
    { useClass: RoomService },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AccountService,
    { useClass: AccountService },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    UserAvatars,
    { useClass: UserAvatars },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    UserService,
    { useClass: UserService },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceDirectory,
    { useClass: WorkspaceDirectory },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceFiles,
    { useClass: WorkspaceFiles },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceLifecycle,
    { useClass: WorkspaceLifecycle },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceManagement,
    { useClass: WorkspaceManagement },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceService,
    { useClass: WorkspaceService },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    ResourceGrantCache,
    { useClass: ResourceGrantCache },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AuthorizationPolicies,
    { useClass: AuthorizationPolicies },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AuthorizationRevocations,
    { useClass: AuthorizationRevocations },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoomScope,
    { useClass: RoomScope },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceAuthorization,
    { useClass: WorkspaceAuthorization },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceAccess,
    { useClass: WorkspaceAccess },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceMutationAccess,
    { useClass: WorkspaceMutationAccess },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    BetterAuthMembership,
    { useClass: BetterAuthMembership },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    SessionTickets,
    { useClass: SessionTickets },
    { lifecycle: Lifecycle.ContainerScoped },
  );
}
