-- Require explicit adoption of pre-Better-Auth workspaces and identities before consolidation.
CREATE TABLE __workspace_identity_guard (valid INTEGER NOT NULL CHECK(valid = 1));
--> statement-breakpoint
INSERT INTO __workspace_identity_guard VALUES (CASE WHEN
 EXISTS (SELECT 1 FROM workspaces w LEFT JOIN auth_organizations o ON o.workspace_id = w.id WHERE o.id IS NULL)
 OR EXISTS (SELECT 1 FROM memberships m LEFT JOIN auth_organizations o ON o.workspace_id = m.workspace_id LEFT JOIN auth_members a ON a.organization_id = o.id AND a.user_id = m.user_id WHERE a.id IS NULL)
 OR EXISTS (SELECT 1 FROM invites i LEFT JOIN auth_users u ON u.id = i.created_by WHERE i.created_by IS NOT NULL AND u.id IS NULL)
 THEN 0 ELSE 1 END);
--> statement-breakpoint
DROP TABLE __workspace_identity_guard;
--> statement-breakpoint
CREATE TABLE __new_auth_organizations (
 id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, slug TEXT NOT NULL, logo TEXT, metadata TEXT,
 is_invite_link_enabled INTEGER NOT NULL DEFAULT true, is_premium INTEGER NOT NULL DEFAULT false,
 customer_id TEXT, created_at INTEGER NOT NULL
);
--> statement-breakpoint
INSERT INTO __new_auth_organizations
 SELECT o.workspace_id, o.name, o.slug, o.logo, o.metadata, COALESCE(w.is_invite_link_enabled, 1), COALESCE(w.is_premium, 0), w.customer_id, o.created_at
 FROM auth_organizations o JOIN workspaces w ON w.id = o.workspace_id;
--> statement-breakpoint
CREATE TABLE `__new_auth_members` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `__new_auth_organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `__new_auth_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`status` text NOT NULL,
	`inviter_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `__new_auth_organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO __new_auth_members SELECT m.id, o.workspace_id, m.user_id, m.role, m.created_at
 FROM auth_members m JOIN auth_organizations o ON o.id = m.organization_id;
--> statement-breakpoint
INSERT INTO __new_auth_invitations SELECT i.id, o.workspace_id, i.email, i.role, i.status, i.inviter_id, i.expires_at, i.created_at
 FROM auth_invitations i JOIN auth_organizations o ON o.id = i.organization_id;
--> statement-breakpoint
CREATE TABLE __new_invites (
 token TEXT NOT NULL, created_by TEXT REFERENCES auth_users(id), emails TEXT,
 workspace_id TEXT NOT NULL REFERENCES __new_auth_organizations(id) ON DELETE CASCADE,
 PRIMARY KEY(token, workspace_id)
);
--> statement-breakpoint
INSERT INTO __new_invites SELECT token, created_by, emails, workspace_id FROM invites;
--> statement-breakpoint
UPDATE auth_sessions SET active_organization_id = (SELECT workspace_id FROM auth_organizations WHERE id = active_organization_id)
 WHERE active_organization_id IS NOT NULL;
--> statement-breakpoint
DROP TABLE auth_members;
--> statement-breakpoint
DROP TABLE auth_invitations;
--> statement-breakpoint
DROP TABLE invites;
--> statement-breakpoint
DROP TABLE auth_organizations;
--> statement-breakpoint
DROP TABLE memberships;
--> statement-breakpoint
DROP TABLE workspaces;
--> statement-breakpoint
ALTER TABLE __new_auth_organizations RENAME TO auth_organizations;
--> statement-breakpoint
ALTER TABLE __new_auth_members RENAME TO auth_members;
--> statement-breakpoint
ALTER TABLE __new_auth_invitations RENAME TO auth_invitations;
--> statement-breakpoint
ALTER TABLE __new_invites RENAME TO invites;
--> statement-breakpoint
CREATE UNIQUE INDEX auth_organizations_slug_unique ON auth_organizations(slug);
--> statement-breakpoint
CREATE UNIQUE INDEX auth_members_organization_user_idx ON auth_members(organization_id, user_id);
--> statement-breakpoint
CREATE INDEX auth_members_user_idx ON auth_members(user_id);
--> statement-breakpoint
CREATE INDEX auth_invitations_organization_idx ON auth_invitations(organization_id);
--> statement-breakpoint
CREATE UNIQUE INDEX invites_token_unique ON invites(token);
--> statement-breakpoint
CREATE UNIQUE INDEX invites_workspace_id_unique ON invites(workspace_id);
