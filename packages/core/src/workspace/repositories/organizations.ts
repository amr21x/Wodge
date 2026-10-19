import {
  authMembers,
  authOrganizations,
  authSessions,
} from "@wodge/domain/auth/schema/d1";
import type { Database } from "@wodge/infra/database/types";
import { and, eq } from "drizzle-orm";
import { inject, injectable } from "tsyringe";

/** Application reads of canonical Better Auth records. Better Auth owns identity writes. */
@injectable()
export class OrganizationRepository {
  constructor(@inject("database") private readonly database: Database) {}

  organization(id: string) {
    return this.database
      .select()
      .from(authOrganizations)
      .where(eq(authOrganizations.id, id))
      .get();
  }
  member(userId: string, organizationId: string) {
    return this.database
      .select()
      .from(authMembers)
      .where(
        and(
          eq(authMembers.userId, userId),
          eq(authMembers.organizationId, organizationId),
        ),
      )
      .get();
  }
  session(userId: string, sessionId: string) {
    return this.database
      .select({ expiresAt: authSessions.expiresAt })
      .from(authSessions)
      .where(
        and(eq(authSessions.id, sessionId), eq(authSessions.userId, userId)),
      )
      .get();
  }
  members(organizationId: string) {
    return this.database
      .select({ userId: authMembers.userId, role: authMembers.role })
      .from(authMembers)
      .where(eq(authMembers.organizationId, organizationId))
      .all();
  }
}
