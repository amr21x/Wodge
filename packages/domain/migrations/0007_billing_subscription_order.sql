CREATE TABLE `billing_subscriptions` (
	`workspace_id` text PRIMARY KEY NOT NULL,
	`change_id` text NOT NULL,
	`event_id` text NOT NULL,
	`event_created` integer NOT NULL,
	`subscription_id` text NOT NULL,
	`subscription_created` integer NOT NULL,
	`customer_id` text NOT NULL,
	`is_premium` integer NOT NULL,
	`ended` integer NOT NULL,
	FOREIGN KEY (`workspace_id`) REFERENCES `auth_organizations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `billing_subscriptions_event_id_unique` ON `billing_subscriptions` (`event_id`);