import { authUsers } from "@wodge/domain/auth/schema/d1";
import type { Database } from "@wodge/infra/database/types";
import { eq, inArray } from "drizzle-orm";
import { inject, injectable } from "tsyringe";

@injectable()
export class UserRepository {
  constructor(@inject("database") private readonly database: Database) {}

  async getUserById(id: string) {
    return this.database.query.authUsers.findFirst({
      where: eq(authUsers.id, id),
    });
  }

  async getUserByUsername(username: string) {
    return this.database.query.authUsers.findFirst({
      where: eq(authUsers.username, username),
    });
  }

  async getUserInfoById(userIds: string[]) {
    return this.database.query.authUsers.findMany({
      where: inArray(authUsers.id, userIds),
    });
  }

  async updateUserById(
    userId: string,
    changes: {
      name?: string;
      image?: string | null;
      username?: string | null;
      updatedAt: Date;
    },
  ) {
    const [user, updated] = await this.database.batch([
      this.database.query.authUsers.findFirst({
        where: eq(authUsers.id, userId),
      }),
      this.database
        .update(authUsers)
        .set(changes)
        .where(eq(authUsers.id, userId))
        .returning(),
    ]);
    return { user, updatedUser: updated[0] };
  }
}
