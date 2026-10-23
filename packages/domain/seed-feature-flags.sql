-- Rerunnable; preserves every existing operator value. Keep in sync with FEATURE_REGISTRY.
INSERT INTO feature_flags (key, enabled) VALUES
  ('workspaceCreation', 1),
  ('workspaceSettings', 1),
  ('membership', 1),
  ('teamManagement', 1),
  ('discussions', 1),
  ('messaging', 1),
  ('polls', 1),
  ('pages', 1),
  ('tasks', 1),
  ('attachments', 0),
  ('avatars', 0),
  ('profiles', 1),
  ('billing', 1),
  ('calls', 0),
  ('agentAccess', 0),
  ('hostedGeneration', 0),
  ('resources', 0)
ON CONFLICT(key) DO NOTHING;
