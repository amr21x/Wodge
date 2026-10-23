import assert from "node:assert/strict";

/** @param {any} database @param {string} migrationSQL */
export async function seedOrganizationMigration(database, migrationSQL) {
  const statements = [
    "INSERT INTO users (id,email,created_at,updated_at) VALUES ('migration-owner','migration@example.test',1700000000,1700000000)",
    "INSERT INTO auth_users (id,name,email,email_verified,created_at,updated_at) VALUES ('migration-owner','Migration owner','migration@example.test',1,1700000000000,1700000000000)",
    "INSERT INTO workspaces (id,owner,name,slug,avatar,created_at,is_invite_link_enabled,is_premium,customer_id) VALUES ('persisted-workspace','migration-owner','Old workspace','old-workspace','old-logo',1700000000,0,1,'customer-preserved')",
    "INSERT INTO memberships (user_id,workspace_id) VALUES ('migration-owner','persisted-workspace')",
    "INSERT INTO auth_organizations (id,workspace_id,name,slug,logo,metadata,created_at) VALUES ('old-organization-id','persisted-workspace','Canonical name','canonical-slug','canonical-logo','{\"theme\":\"dark\"}',1700000000000)",
    "INSERT INTO auth_members (id,organization_id,user_id,role,created_at) VALUES ('preserved-member','old-organization-id','migration-owner','owner',1700000000000)",
    "INSERT INTO auth_sessions (id,token,user_id,expires_at,created_at,updated_at,active_organization_id) VALUES ('migration-session','migration-token','migration-owner',9999999999999,1700000000000,1700000000000,'old-organization-id')",
    "INSERT INTO invites (token,created_by,workspace_id) VALUES ('preserved-link','migration-owner','persisted-workspace')",
    "INSERT INTO auth_invitations (id,organization_id,email,role,status,inviter_id,expires_at,created_at) VALUES ('preserved-invitation','old-organization-id','invitee@example.test','member','pending','migration-owner',9999999999999,1700000000000)",
  ];
  await database.batch(statements.map((sql) => database.prepare(sql)));
  await database
    .prepare(
      "INSERT INTO workspaces (id,owner,name,slug,created_at) VALUES ('unadopted-workspace','migration-owner','Unadopted','unadopted',1700000000)",
    )
    .run();
  const guard = migrationSQL.split("--> statement-breakpoint").slice(0, 2);
  await assert.rejects(
    database.batch(guard.map((sql) => database.prepare(sql))),
    /CHECK constraint failed/,
  );
  assert.ok(
    await database
      .prepare("SELECT id FROM workspaces WHERE id = 'unadopted-workspace'")
      .first(),
  );
  assert.ok(
    await database
      .prepare(
        "SELECT id FROM auth_organizations WHERE id = 'old-organization-id'",
      )
      .first(),
  );
  await database
    .prepare("DELETE FROM workspaces WHERE id = 'unadopted-workspace'")
    .run();
}

/** Seeds Stripe-era billing state and returns the organization's plan before the Polar reset. */
/** @param {any} database */
export async function seedBillingReset(database) {
  await database
    .prepare(
      "INSERT INTO billing_subscriptions (workspace_id,change_id,event_id,event_created,subscription_id,subscription_created,customer_id,is_premium,ended) VALUES ('persisted-workspace','change','evt_stripe',1,'sub_stripe',1,'customer-preserved',1,0)",
    )
    .run();
  return database
    .prepare(
      "SELECT is_premium, customer_id FROM auth_organizations WHERE id = 'persisted-workspace'",
    )
    .first();
}

/** @param {any} database @param {any} billingBeforeReset */
export async function verifyOrganizationMigration(
  database,
  billingBeforeReset,
) {
  const workspace = await database
    .prepare(
      "SELECT * FROM auth_organizations WHERE id = 'persisted-workspace'",
    )
    .first();
  assert.equal(workspace.name, "Canonical name");
  assert.equal(workspace.slug, "canonical-slug");
  assert.equal(workspace.logo, "canonical-logo");
  assert.equal(workspace.is_invite_link_enabled, 0);
  assert.deepEqual(billingBeforeReset, {
    is_premium: 1,
    customer_id: "customer-preserved",
  });
  // Stripe customers have no Polar counterpart, so the cutover returns workspaces to Basic.
  assert.equal(workspace.is_premium, 0);
  assert.equal(workspace.customer_id, null);
  assert.equal(
    await database
      .prepare(
        "SELECT workspace_id FROM billing_subscriptions WHERE workspace_id = 'persisted-workspace'",
      )
      .first(),
    null,
  );
  assert.equal(workspace.workspace_id, undefined);
  assert.equal(
    (
      await database
        .prepare(
          "SELECT organization_id FROM auth_members WHERE id = 'preserved-member'",
        )
        .first()
    ).organization_id,
    workspace.id,
  );
  assert.equal(
    (
      await database
        .prepare(
          "SELECT organization_id FROM auth_invitations WHERE id = 'preserved-invitation'",
        )
        .first()
    ).organization_id,
    workspace.id,
  );
  assert.equal(
    (
      await database
        .prepare(
          "SELECT active_organization_id FROM auth_sessions WHERE id = 'migration-session'",
        )
        .first()
    ).active_organization_id,
    workspace.id,
  );
  assert.equal(
    (
      await database
        .prepare(
          "SELECT workspace_id FROM invites WHERE token = 'preserved-link'",
        )
        .first()
    ).workspace_id,
    workspace.id,
  );
  assert.deepEqual(
    (await database.prepare("PRAGMA foreign_key_check").all()).results,
    [],
  );
  await database
    .prepare("DELETE FROM auth_organizations WHERE id = ?")
    .bind(workspace.id)
    .run();
  assert.equal(
    await database
      .prepare("SELECT id FROM auth_members WHERE id = 'preserved-member'")
      .first(),
    null,
  );
  assert.equal(
    await database
      .prepare("SELECT token FROM invites WHERE token = 'preserved-link'")
      .first(),
    null,
  );
  await database
    .prepare("DELETE FROM auth_users WHERE id = 'migration-owner'")
    .run();
}
