CREATE TABLE `authorization_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`role_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`scope_type` text NOT NULL,
	`scope_id` text NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `authorization_roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `authorization_outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`revision` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `authorization_permissions` (
	`role_id` text NOT NULL,
	`resource` text NOT NULL,
	`action` text NOT NULL,
	PRIMARY KEY(`role_id`, `resource`, `action`),
	FOREIGN KEY (`role_id`) REFERENCES `authorization_roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `authorization_policy` (
	`id` integer PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`revision` integer NOT NULL,
	`schema_version` integer NOT NULL,
	`resources_migrated` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `authorization_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`name` text NOT NULL,
	`system` text
);
--> statement-breakpoint
CREATE TABLE `sync_client_groups` (
	`key` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`user_id` text NOT NULL,
	`client_version` integer
);
--> statement-breakpoint
CREATE TABLE `sync_clients` (
	`key` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`group_id` text NOT NULL,
	`last_mutation_id` integer NOT NULL,
	`last_modified_version` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_import` (
	`id` integer PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sync_versions` (
	`name` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_presence` (
	`user_id` text PRIMARY KEY NOT NULL,
	`online` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `workspace_presence_import` (
	`id` integer PRIMARY KEY NOT NULL
);
