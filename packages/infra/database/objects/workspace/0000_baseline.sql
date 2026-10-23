CREATE TABLE IF NOT EXISTS `workspace_channel_groups` (
	`team_id` text NOT NULL,
	`kind` text NOT NULL,
	`channel_id` text NOT NULL,
	`permission` text NOT NULL,
	`position` integer NOT NULL,
	`group_id` text NOT NULL,
	PRIMARY KEY(`team_id`, `kind`, `channel_id`, `permission`, `position`),
	FOREIGN KEY (`team_id`,`kind`,`channel_id`) REFERENCES `workspace_channels`(`team_id`,`kind`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workspace_channels` (
	`team_id` text NOT NULL,
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`folder_id` text,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`avatar` text,
	PRIMARY KEY(`team_id`, `kind`, `id`),
	FOREIGN KEY (`team_id`) REFERENCES `workspace_teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workspace_channel_placement` ON `workspace_channels` (`team_id`,`kind`,`folder_id`,`position`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workspace_folders` (
	`team_id` text NOT NULL,
	`id` text NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`parent_folder` text,
	PRIMARY KEY(`team_id`, `id`),
	FOREIGN KEY (`team_id`) REFERENCES `workspace_teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workspace_group_members` (
	`group_id` text NOT NULL,
	`position` integer NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`group_id`, `position`),
	FOREIGN KEY (`group_id`) REFERENCES `workspace_groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workspace_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`color` text NOT NULL,
	`created_by` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workspace_members` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`role` text NOT NULL,
	`token` text NOT NULL,
	`created_by` text NOT NULL,
	`joined_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workspace_membership` (
	`id` integer PRIMARY KEY NOT NULL,
	`created_by` text NOT NULL,
	CONSTRAINT "workspace_membership_singleton" CHECK("workspace_membership"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workspace_team_members` (
	`team_id` text NOT NULL,
	`kind` text NOT NULL,
	`position` integer NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`team_id`, `kind`, `position`),
	FOREIGN KEY (`team_id`) REFERENCES `workspace_teams`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `workspace_teams` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`avatar` text,
	`created_by` text NOT NULL,
	`is_default` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `record_metadata` (
	`name` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`deleted` integer NOT NULL
);
