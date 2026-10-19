import { primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { authOrganizations, authUsers } from "../../auth/schema/d1";

// Reusable public join links are separate from Better Auth's email invitations.
export const invites = sqliteTable(
  "invites",
  {
    token: text("token").unique().notNull(),
    createdBy: text("created_by").references(() => authUsers.id),
    emails: text("emails"),
    workspaceId: text("workspace_id")
      .notNull()
      .unique()
      .references(() => authOrganizations.id, { onDelete: "cascade" }),
  },
  (table) => ({
    primaryKey: primaryKey({ columns: [table.token, table.workspaceId] }),
  }),
);
