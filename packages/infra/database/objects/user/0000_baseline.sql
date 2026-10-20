CREATE TABLE IF NOT EXISTS `user_structure_import` (
	`id` integer PRIMARY KEY NOT NULL,
	CONSTRAINT "user_structure_import_singleton" CHECK("user_structure_import"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `user_workspaces` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL
);
