-- Refuse to discard a legacy profile without an explicitly linked Better Auth identity.
CREATE TABLE __canonical_user_identity_guard (valid INTEGER NOT NULL CHECK(valid = 1));
--> statement-breakpoint
INSERT INTO __canonical_user_identity_guard VALUES (CASE WHEN EXISTS (
 SELECT 1 FROM users u LEFT JOIN auth_users a ON a.id = u.id WHERE a.id IS NULL
) THEN 0 ELSE 1 END);
--> statement-breakpoint
DROP TABLE __canonical_user_identity_guard;
--> statement-breakpoint
ALTER TABLE auth_users ADD username TEXT;
--> statement-breakpoint
-- Email and verification remain authoritative in Better Auth. Copy profile fields by stable ID.
-- Legacy profile timestamps are seconds. Auth timestamps are milliseconds.
UPDATE auth_users SET
 username = (SELECT u.username FROM users u WHERE u.id = auth_users.id),
 name = COALESCE((SELECT u.display_name FROM users u WHERE u.id = auth_users.id), name),
 image = (SELECT u.avatar FROM users u WHERE u.id = auth_users.id),
 updated_at = MAX(updated_at, (SELECT u.updated_at * 1000 FROM users u WHERE u.id = auth_users.id))
 WHERE EXISTS (SELECT 1 FROM users u WHERE u.id = auth_users.id);
--> statement-breakpoint
CREATE UNIQUE INDEX auth_users_username_unique ON auth_users(username);
--> statement-breakpoint
DROP TABLE users;
