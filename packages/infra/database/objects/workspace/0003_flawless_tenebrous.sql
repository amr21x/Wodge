PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_authorization_policy` (
	`id` integer PRIMARY KEY NOT NULL,
	`workspace_id` text,
	`revision` integer NOT NULL,
	`schema_version` integer NOT NULL,
	`resources_migrated` integer
);
--> statement-breakpoint
INSERT INTO `__new_authorization_policy`("id", "workspace_id", "revision", "schema_version", "resources_migrated") SELECT "id", "workspace_id", "revision", "schema_version", "resources_migrated" FROM `authorization_policy`;--> statement-breakpoint
DROP TABLE `authorization_policy`;--> statement-breakpoint
ALTER TABLE `__new_authorization_policy` RENAME TO `authorization_policy`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `authorization_permissions` ADD `position` integer NOT NULL;--> statement-breakpoint
ALTER TABLE `sync_import` ADD `legacy_versions` integer DEFAULT 0 NOT NULL;