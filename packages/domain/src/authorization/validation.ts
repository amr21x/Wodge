import { z } from "zod";
import { permissionCatalogue } from "./permissions";

export const PermissionSetSchema = z
  .object({
    workspace: z.array(z.enum(permissionCatalogue.workspace)).optional(),
    team: z.array(z.enum(permissionCatalogue.team)).optional(),
    role: z.array(z.enum(permissionCatalogue.role)).optional(),
    room: z.array(z.enum(permissionCatalogue.room)).optional(),
    message: z.array(z.enum(permissionCatalogue.message)).optional(),
    page: z.array(z.enum(permissionCatalogue.page)).optional(),
    thread: z.array(z.enum(permissionCatalogue.thread)).optional(),
  })
  .strict();

export const PermissionsSchema = PermissionSetSchema.refine(
  (value) => Object.values(value).some((actions) => actions?.length),
  "At least one permission is required",
);

export const AuthorizationScopeSchema = z
  .object({
    type: z.enum(["workspace", "team", "room", "page", "thread"]),
    id: z.string().min(1),
  })
  .strict();

export const CreateRoleSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Role name is required")
      .max(80, "Role name must be 80 characters or fewer"),
    permissions: PermissionsSchema,
  })
  .strict();

export const UpdateRoleSchema = CreateRoleSchema.extend({
  roleId: z.string().min(1),
});

export const AssignRoleSchema = z
  .object({
    roleId: z.string().min(1),
    subject: z
      .object({ type: z.enum(["user", "team"]), id: z.string().min(1) })
      .strict(),
    scope: AuthorizationScopeSchema,
  })
  .strict();

export const PermissionRequestSchema = z
  .object({
    scope: AuthorizationScopeSchema,
    permissions: PermissionsSchema,
  })
  .strict();

export const RoomAuthorizationScopeSchema = z
  .object({
    workspaceId: z.string().min(1),
    teamId: z.string().min(1),
    roomId: z.string().min(1),
  })
  .strict();

export const AuthorizationPrincipalSchema = z
  .object({
    userId: z.string().min(1),
    sessionId: z.string().min(1),
  })
  .strict();

/** Authority responses may contain an empty permission set. */
export const ResourceGrantSchema = z
  .object({
    principal: AuthorizationPrincipalSchema,
    workspaceId: z.string().min(1),
    scope: AuthorizationScopeSchema,
    permissions: PermissionSetSchema,
    policyRevision: z.number().int().nonnegative(),
    issuedAt: z.number().finite().nonnegative(),
    expiresAt: z.number().finite().nonnegative(),
  })
  .strict();
