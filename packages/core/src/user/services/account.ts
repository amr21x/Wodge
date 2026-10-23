import { toUserProfile } from "@wodge/core/user/profile";
import { UserRepository } from "@wodge/core/user/repositories/profiles";
import type { UserType } from "@wodge/domain/user/models";
import { inject, injectable } from "tsyringe";

@injectable()
export class AccountService {
  constructor(
    @inject(UserRepository)
    private readonly users: Pick<
      UserRepository,
      "getUserById" | "getUserByUsername" | "getUserInfoById" | "updateUserById"
    >,
  ) {}

  async getUserById(id?: string) {
    try {
      const user = await this.users.getUserById(id ?? "");
      return user ? toUserProfile(user) : undefined;
    } catch {
      return null;
    }
  }

  async getUserByUsername(username: string) {
    try {
      const user = await this.users.getUserByUsername(username);
      if (!user) return undefined;
      const { id: _id, ...profile } = toUserProfile(user);
      return profile;
    } catch {
      return null;
    }
  }

  async getUserInfoById(ids: string[]) {
    try {
      return (await this.users.getUserInfoById(ids)).map((user) => {
        const {
          createdAt: _createdAt,
          updatedAt: _updatedAt,
          ...profile
        } = toUserProfile(user);
        return profile;
      });
    } catch {
      return null;
    }
  }

  async update(
    userId: string,
    data: Partial<
      Pick<UserType, "username" | "displayName" | "avatar" | "updatedAt">
    >,
  ) {
    try {
      const result = await this.users.updateUserById(userId, {
        name: data.displayName,
        image: data.avatar,
        username: data.username,
        updatedAt: data.updatedAt ?? new Date(),
      });
      return {
        user: result.user ? toUserProfile(result.user) : undefined,
        updatedUser: result.updatedUser
          ? toUserProfile(result.updatedUser)
          : undefined,
      };
    } catch (error) {
      if (!(error instanceof Error)) return { error: "Internal server error" };
      return {
        error: error.message.includes(
          "UNIQUE constraint failed: auth_users.username",
        )
          ? "Dup username"
          : "Failed to update user",
      };
    }
  }
}
