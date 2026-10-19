import type { authUsers } from "@wodge/domain/auth/schema/d1";
import type { UserType } from "@wodge/domain/user/models";

type AuthUser = typeof authUsers.$inferSelect;
type ProfileSource = Pick<
  AuthUser,
  "id" | "email" | "name" | "createdAt" | "updatedAt"
> &
  Partial<Pick<AuthUser, "image" | "username">>;

/** Map the session/database user to the existing application DTO without exposing auth fields. */
export function toUserProfile(user: ProfileSource): UserType {
  return {
    id: user.id,
    email: user.email,
    displayName: user.name,
    avatar: user.image ?? null,
    username: user.username ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
