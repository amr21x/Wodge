import { authSessions } from "@wodge/domain/auth/schema/d1";
import type { Database } from "@wodge/infra/database/types";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "tsyringe";

@injectable()
export class SessionRepository {
  constructor(@inject("database") private readonly database: Database) {}

  async get(sessionId: string, userId: string) {
    const session = await this.database
      .select({ expiresAt: authSessions.expiresAt })
      .from(authSessions)
      .where(
        and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)),
      )
      .get();

    return session;
  }
}
