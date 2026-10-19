import type { z } from "zod";
import type { authUsers } from "../auth/schema/d1";
import type { PublicUserSchema } from "./validation";

/**
 * User workspaces store type
 */
export type UserWorkspacesStore = {
  workspaceId: string;
};

export type PublicUserType = z.infer<typeof PublicUserSchema>;

type AuthUser = typeof authUsers.$inferSelect;

// Application field names are a view of Better Auth's user, not a second record.
export type UserType = Pick<
  AuthUser,
  "id" | "email" | "username" | "createdAt" | "updatedAt"
> & {
  displayName: AuthUser["name"];
  avatar: AuthUser["image"];
};

export type User = UserType;
