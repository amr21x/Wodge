import type { z } from "zod";
import type { ResourceGrantSchema } from "./validation";
import type { Permissions } from "./permissions";

export type AuthorizationScope = {
  type: "workspace" | "team" | "room" | "page" | "thread";
  id: string;
};

export type AuthorizationSubject = { type: "user" | "team"; id: string };

export interface AuthorizationPrincipal {
  userId: string;
  sessionId: string;
}

export interface AuthorizationRole {
  id: string;
  name: string;
  permissions: Permissions;
  system?: "owner" | "administrator" | "reader" | "editor" | "moderator";
}

export interface RoleAssignment {
  id: string;
  roleId: string;
  subject: AuthorizationSubject;
  scope: AuthorizationScope;
}

export interface AuthorizationPolicy {
  schemaVersion: 1;
  workspaceId: string;
  revision: number;
  roles: AuthorizationRole[];
  assignments: RoleAssignment[];
}

export interface PermissionRequest {
  scope: AuthorizationScope;
  permissions: Permissions;
}

export type PermissionResult =
  | { success: true }
  | { success: false; code: "AUTHORIZATION_FORBIDDEN" };

export type ResourceGrant = z.output<typeof ResourceGrantSchema>;

export interface RoomAuthorizationScope {
  workspaceId: string;
  teamId: string;
  roomId: string;
}

export interface AuthorizationInvalidation {
  id: string;
  workspaceId: string;
  revision: number;
  createdAt: number;
}
