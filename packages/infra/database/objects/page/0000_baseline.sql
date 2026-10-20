CREATE TABLE IF NOT EXISTS `page_columns` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`title` text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `page_task_assignees` (
	`task_id` text NOT NULL,
	`position` integer NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`task_id`, `position`),
	FOREIGN KEY (`task_id`) REFERENCES `page_tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `page_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`column_id` text NOT NULL,
	`position` integer NOT NULL,
	`overview` text,
	`title` text,
	`due_from` text,
	`due_to` text,
	`has_due` integer NOT NULL,
	`has_assignees` integer NOT NULL,
	`priority` text,
	`include_time` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `page_tasks_column_order` ON `page_tasks` (`column_id`,`position`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `record_metadata` (
	`name` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`deleted` integer NOT NULL
);
