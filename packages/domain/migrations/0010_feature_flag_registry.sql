-- Object storage is not provisioned yet, so storage-backed features start disabled.
-- Enable both after configuring R2, as described in the production deployment runbook.
INSERT INTO feature_flags (key, enabled) VALUES ('avatars', 0) ON CONFLICT(key) DO NOTHING;
--> statement-breakpoint
UPDATE feature_flags SET enabled = 0 WHERE key = 'attachments';
--> statement-breakpoint
-- Access groups were removed from the product and the flag registry.
DELETE FROM feature_flags WHERE key = 'groups';
