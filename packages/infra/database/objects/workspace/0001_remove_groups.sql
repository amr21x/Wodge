CREATE TABLE `workspace_permission_import_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`complete` integer NOT NULL,
	CONSTRAINT "workspace_permission_import_singleton" CHECK("workspace_permission_import_state"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE `workspace_permission_imports` (
	`scope_type` text NOT NULL,
	`scope_id` text NOT NULL,
	`subject_type` text NOT NULL,
	`subject_id` text NOT NULL,
	`access` text NOT NULL,
	PRIMARY KEY(`scope_type`, `scope_id`, `subject_type`, `subject_id`, `access`)
);
--> statement-breakpoint
-- Resolve the old access lists before removing their source tables.
INSERT INTO workspace_permission_import_state (id, complete)
SELECT 1, 0 WHERE EXISTS (SELECT 1 FROM record_metadata WHERE name = 'structure');
--> statement-breakpoint
INSERT OR IGNORE INTO workspace_permission_imports
SELECT kind, channel_id, 'team', team_id,
  CASE permission WHEN 'edit' THEN 'update' ELSE 'read' END
FROM workspace_channel_groups WHERE group_id = 'team-members' AND kind IN ('room','page');
--> statement-breakpoint
INSERT OR IGNORE INTO workspace_permission_imports
SELECT grants.kind, grants.channel_id, 'user', members.user_id,
  CASE grants.permission WHEN 'edit' THEN 'update' ELSE 'read' END
FROM workspace_channel_groups grants
JOIN workspace_group_members members ON members.group_id = grants.group_id
JOIN workspace_team_members team ON team.team_id = grants.team_id AND team.user_id = members.user_id AND team.kind = 'member'
WHERE grants.kind IN ('room','page');
--> statement-breakpoint
INSERT OR IGNORE INTO workspace_permission_imports
SELECT kind, id, 'team', team_id, 'read' FROM workspace_channels WHERE kind = 'thread'
UNION ALL SELECT kind, id, 'team', team_id, 'update' FROM workspace_channels WHERE kind = 'thread';
--> statement-breakpoint
DROP TABLE `workspace_channel_groups`;--> statement-breakpoint
DROP TABLE `workspace_group_members`;--> statement-breakpoint
DROP TABLE `workspace_groups`;