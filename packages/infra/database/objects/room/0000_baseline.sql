CREATE TABLE IF NOT EXISTS `room_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`sender` text NOT NULL,
	`content` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`is_edited` integer,
	`is_vote_open` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `room_messages_order` ON `room_messages` (`position`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `record_metadata` (
	`name` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`deleted` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `poll_counts` (
	`parent_id` text NOT NULL,
	`position` integer NOT NULL,
	`votes` integer NOT NULL,
	PRIMARY KEY(`parent_id`, `position`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `poll_options` (
	`parent_id` text NOT NULL,
	`position` integer NOT NULL,
	`label` text NOT NULL,
	PRIMARY KEY(`parent_id`, `position`)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `poll_voters` (
	`parent_id` text NOT NULL,
	`position` integer NOT NULL,
	`voter` text NOT NULL,
	`option` integer NOT NULL,
	PRIMARY KEY(`parent_id`, `position`)
);
