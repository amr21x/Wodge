CREATE TABLE `page_document` (
	`id` integer PRIMARY KEY NOT NULL,
	`sequence` integer NOT NULL,
	`snapshot_sequence` integer NOT NULL,
	`snapshot` blob,
	CONSTRAINT "page_document_singleton" CHECK("page_document"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `page_document_updates` (
	`sequence` integer PRIMARY KEY NOT NULL,
	`update` blob NOT NULL
);
