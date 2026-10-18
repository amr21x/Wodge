import { BackendApplication } from "../application";
import { RoomGateway } from "../gateways/room";
import { UserNotifications } from "../gateways/user-notifications";
import { UserGateway } from "../gateways/user";
import { WorkspaceAuthorizationGateway } from "../gateways/workspace-authorization";
import { WorkspaceMemberships } from "../gateways/workspace-memberships";
import { WorkspaceNotifications } from "../gateways/workspace-notifications";
import { WorkspaceGateway } from "../gateways/workspace";
import { AccountHandlers } from "../handlers/api/account";
import { AvatarHandlers } from "../handlers/api/avatar";
import { BillingHandlers } from "../handlers/api/billing";
import { ScopedHandlers } from "../handlers/api/scoped";
import { WorkspaceHandlers } from "../handlers/api/workspace";
import { AssignmentHandlers } from "../handlers/authorization/assignments";
import { PermissionHandlers } from "../handlers/authorization/permissions";
import { RoleHandlers } from "../handlers/authorization/roles";
import { RoomScopeHandlers } from "../handlers/authorization/room-scope";
import { DiscussionsHandlers } from "../handlers/discussions/handlers";
import { PagesHandlers } from "../handlers/pages/handlers";
import { RoomsHandlers } from "../handlers/rooms/handlers";
import { UserHandlers } from "../handlers/user/handlers";
import { WorkspaceFilesHandlers } from "../handlers/workspace/files";
import { WorkspaceHandlers as WorkspaceObjectHandlers } from "../handlers/workspace/handlers";
import { AuthorizationInvalidations } from "../lib/authorization/invalidation";
import { ThreadSync } from "../lib/sync/discussions";
import { PageSync } from "../lib/sync/pages";
import { RoomSync } from "../lib/sync/rooms";
import { WorkspaceSync } from "../lib/sync/workspace";
import { AccountRoutes } from "../routes/api/accounts";
import { AvatarRoutes } from "../routes/api/avatars";
import { BillingRoutes } from "../routes/api/billing";
import { WorkspaceApiRoutes } from "../routes/api/workspaces";
import { ApiRoutes } from "../routes/api";
import { AuthorizationRoutes } from "../routes/authorization";
import { DiscussionRoutes } from "../routes/discussions";
import { PageRoutes } from "../routes/pages";
import { RoomRoutes } from "../routes/rooms";
import { UserRoutes } from "../routes/user";
import { WorkspaceRoutes } from "../routes/workspace";
import { Lifecycle, type DependencyContainer } from "tsyringe";

// Lifetimes are declared here, never as module-import side effects in the classes.
export function registerTransport(container: DependencyContainer) {
  container.register(
    BackendApplication,
    { useClass: BackendApplication },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoomGateway,
    { useClass: RoomGateway },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    UserNotifications,
    { useClass: UserNotifications },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    UserGateway,
    { useClass: UserGateway },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceAuthorizationGateway,
    { useClass: WorkspaceAuthorizationGateway },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceMemberships,
    { useClass: WorkspaceMemberships },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceNotifications,
    { useClass: WorkspaceNotifications },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceGateway,
    { useClass: WorkspaceGateway },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AccountHandlers,
    { useClass: AccountHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AvatarHandlers,
    { useClass: AvatarHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    BillingHandlers,
    { useClass: BillingHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    ScopedHandlers,
    { useClass: ScopedHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceHandlers,
    { useClass: WorkspaceHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AssignmentHandlers,
    { useClass: AssignmentHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PermissionHandlers,
    { useClass: PermissionHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoleHandlers,
    { useClass: RoleHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoomScopeHandlers,
    { useClass: RoomScopeHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    DiscussionsHandlers,
    { useClass: DiscussionsHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PagesHandlers,
    { useClass: PagesHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoomsHandlers,
    { useClass: RoomsHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    UserHandlers,
    { useClass: UserHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceFilesHandlers,
    { useClass: WorkspaceFilesHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceObjectHandlers,
    { useClass: WorkspaceObjectHandlers },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AuthorizationInvalidations,
    { useClass: AuthorizationInvalidations },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    ThreadSync,
    { useClass: ThreadSync },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PageSync,
    { useClass: PageSync },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoomSync,
    { useClass: RoomSync },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceSync,
    { useClass: WorkspaceSync },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AccountRoutes,
    { useClass: AccountRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AvatarRoutes,
    { useClass: AvatarRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    BillingRoutes,
    { useClass: BillingRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceApiRoutes,
    { useClass: WorkspaceApiRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    ApiRoutes,
    { useClass: ApiRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    AuthorizationRoutes,
    { useClass: AuthorizationRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    DiscussionRoutes,
    { useClass: DiscussionRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    PageRoutes,
    { useClass: PageRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    RoomRoutes,
    { useClass: RoomRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    UserRoutes,
    { useClass: UserRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
  container.register(
    WorkspaceRoutes,
    { useClass: WorkspaceRoutes },
    { lifecycle: Lifecycle.ContainerScoped },
  );
}
