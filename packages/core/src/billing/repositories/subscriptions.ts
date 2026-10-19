import type { SubscriptionState } from "@wodge/domain/billing/dto";
import { billingSubscriptions } from "@wodge/domain/billing/schema/d1";
import { authOrganizations } from "@wodge/domain/auth/schema/d1";
import type { Database } from "@wodge/infra/database/types";
import { and, eq, exists } from "drizzle-orm";
import { inject, injectable } from "tsyringe";

@injectable()
export class SubscriptionRepository {
  constructor(@inject("database") private readonly database: Database) {}

  get(workspaceId: string) {
    return this.database
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.workspaceId, workspaceId))
      .get();
  }

  async commit(
    event: SubscriptionState,
    expectedChangeId: string | undefined,
    plan: { isPremium: boolean; customerId: string | null },
  ) {
    const insert = this.database.insert(billingSubscriptions).values(event);
    const update = expectedChangeId
      ? insert.onConflictDoUpdate({
          target: billingSubscriptions.workspaceId,
          set: event,
          setWhere: eq(billingSubscriptions.changeId, expectedChangeId),
        })
      : insert.onConflictDoNothing();
    // D1 batch is transactional: a racing delivery cannot publish a plan without its cursor.
    const [changed] = await this.database.batch([
      update.returning({ eventId: billingSubscriptions.eventId }),
      this.database
        .update(authOrganizations)
        .set(plan)
        .where(
          and(
            eq(authOrganizations.id, event.workspaceId),
            exists(
              this.database
                .select({ eventId: billingSubscriptions.eventId })
                .from(billingSubscriptions)
                .where(
                  and(
                    eq(billingSubscriptions.workspaceId, event.workspaceId),
                    eq(billingSubscriptions.changeId, event.changeId),
                  ),
                ),
            ),
          ),
        ),
    ]);
    return changed.length > 0;
  }
}
