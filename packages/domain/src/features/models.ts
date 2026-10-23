/** Environment-wide product switches. Authentication and recovery are infrastructure. */
export const FEATURE_REGISTRY = {
  workspaceCreation: { default: true, available: true },
  workspaceSettings: { default: true, available: true },
  membership: { default: true, available: true },
  teamManagement: { default: true, available: true },
  discussions: { default: true, available: true },
  messaging: { default: true, available: true },
  polls: { default: true, available: true },
  pages: { default: true, available: true },
  tasks: { default: true, available: true },
  // Object storage is not provisioned yet; enable after configuring R2.
  attachments: { default: false, available: true },
  avatars: { default: false, available: true },
  profiles: { default: true, available: true },
  billing: { default: true, available: true },
  // The selected Calls/SFU replacement and MCP transport are not implemented.
  calls: { default: false, available: false },
  agentAccess: { default: false, available: false },
  // These legacy implementations are outside the approved product scope.
  hostedGeneration: { default: false, available: false },
  resources: { default: false, available: false },
} as const;

export type Feature = keyof typeof FEATURE_REGISTRY;
export type FeatureFlags = Record<Feature, boolean>;
export const FEATURES = Object.keys(FEATURE_REGISTRY) as Feature[];
export const FLAG_REFRESH_MS = 15_000;
export const FLAG_MAX_STALE_MS = 60_000;
export const FLAG_REQUEST_TIMEOUT_MS = 5_000;

export interface FlagSnapshot {
  flags: FeatureFlags;
  /** Absolute expiry travels across runtimes; failures never extend it. */
  validUntil: number;
  source: "database" | "last-known-good" | "closed";
}

export const CHANNEL_FEATURES = {
  page: "pages",
  room: "messaging",
  thread: "discussions",
  resources: "resources",
} as const;
