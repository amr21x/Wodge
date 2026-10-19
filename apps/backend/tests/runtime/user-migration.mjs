import assert from "node:assert/strict";

/** @param {any} database @param {string} migrationSQL */
export async function seedUserMigration(database, migrationSQL) {
  await database.batch([
    database.prepare(
      "INSERT INTO auth_users (id,name,email,email_verified,image,created_at,updated_at) VALUES ('profile-migration','Auth name','verified@example.test',1,'old-image',1700000000000,1700000000000)",
    ),
    database.prepare(
      "INSERT INTO users (id,email,display_name,avatar,username,created_at,updated_at) VALUES ('profile-migration','stale@example.test','Updated profile',NULL,'preserved_username',1700000000,1700000010)",
    ),
    database.prepare(
      "INSERT INTO auth_sessions (id,token,user_id,expires_at,created_at,updated_at) VALUES ('profile-session','profile-token','profile-migration',9999999999999,1700000000000,1700000000000)",
    ),
    database.prepare(
      "INSERT INTO users (id,email,created_at,updated_at) VALUES ('unlinked-profile','unlinked@example.test',1700000000,1700000000)",
    ),
  ]);
  const guard = migrationSQL.split("--> statement-breakpoint").slice(0, 2);
  await assert.rejects(
    database.batch(guard.map((sql) => database.prepare(sql))),
    /CHECK constraint failed/,
  );
  assert.ok(
    await database
      .prepare("SELECT id FROM users WHERE id = 'unlinked-profile'")
      .first(),
  );
  await database
    .prepare("DELETE FROM users WHERE id = 'unlinked-profile'")
    .run();
}

/** @param {any} database */
export async function verifyUserMigration(database) {
  const user = await database
    .prepare("SELECT * FROM auth_users WHERE id = 'profile-migration'")
    .first();
  assert.equal(user.id, "profile-migration");
  assert.equal(user.name, "Updated profile");
  assert.equal(user.username, "preserved_username");
  assert.equal(user.image, null);
  assert.equal(user.email, "verified@example.test");
  assert.equal(user.email_verified, 1);
  assert.equal(user.created_at, 1700000000000);
  assert.equal(user.updated_at, 1700000010000);
  const session = await database
    .prepare("SELECT user_id FROM auth_sessions WHERE id = 'profile-session'")
    .first();
  assert.equal(session.user_id, user.id);
  assert.equal(
    await database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'",
      )
      .first(),
    null,
  );
  await database
    .prepare("DELETE FROM auth_users WHERE id = 'profile-migration'")
    .run();
}
