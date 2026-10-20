CREATE TABLE IF NOT EXISTS `thread_comments` (
	`post_id` text NOT NULL,
	`id` text NOT NULL,
	`position` integer NOT NULL,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`type` text NOT NULL,
	`is_edited` integer,
	PRIMARY KEY(`post_id`, `id`),
	FOREIGN KEY (`post_id`) REFERENCES `thread_posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `thread_comments_order` ON `thread_comments` (`post_id`,`position`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `thread_posts` (
	`id` text PRIMARY KEY NOT NULL,
	`position` integer NOT NULL,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text NOT NULL,
	`type` text NOT NULL,
	`is_resolved` integer,
	`is_edited` integer,
	`is_vote_open` integer
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `thread_posts_order` ON `thread_posts` (`position`);--> statement-breakpoint
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
