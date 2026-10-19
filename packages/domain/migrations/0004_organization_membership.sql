CREATE TABLE `auth_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`email` text NOT NULL,
	`role` text,
	`status` text NOT NULL,
	`inviter_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `auth_organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`inviter_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `auth_invitations_organization_idx` ON `auth_invitations` (`organization_id`);--> statement-breakpoint
CREATE TABLE `auth_members` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`user_id` text NOT NULL,
	`role` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `auth_organizations`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_members_organization_user_idx` ON `auth_members` (`organization_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `auth_members_user_idx` ON `auth_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_organizations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo` text,
	`metadata` text,
	`workspace_id` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_organizations_slug_unique` ON `auth_organizations` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_organizations_workspace_id_unique` ON `auth_organizations` (`workspace_id`);--> statement-breakpoint
ALTER TABLE `auth_sessions` ADD `active_organization_id` text;