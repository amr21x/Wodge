import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { authOrganizations } from "../../auth/schema/d1";

export const billingSubscriptions = sqliteTable("billing_subscriptions", {
  workspaceId: text("workspace_id")
    .primaryKey()
    .references(() => authOrganizations.id, { onDelete: "cascade" }),
  changeId: text("change_id").notNull(),
  eventId: text("event_id").notNull().unique(),
  eventCreated: integer("event_created").notNull(),
  subscriptionId: text("subscription_id").notNull(),
  subscriptionCreated: integer("subscription_created").notNull(),
  customerId: text("customer_id").notNull(),
  isPremium: integer("is_premium", { mode: "boolean" }).notNull(),
  ended: integer("ended", { mode: "boolean" }).notNull(),
});
