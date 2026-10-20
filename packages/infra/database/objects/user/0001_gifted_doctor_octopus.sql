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
