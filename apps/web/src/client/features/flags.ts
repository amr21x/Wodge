import {
  FEATURES,
  FEATURE_REGISTRY,
  FLAG_MAX_STALE_MS,
  type Feature,
  type FeatureFlags,
  type FlagSnapshot,
} from "@wodge/domain/features/models";
export function closedFlags(): FeatureFlags {
  return Object.fromEntries(
    FEATURES.map((key) => [key, false]),
  ) as FeatureFlags;
}

function parseFlagSnapshot(value: unknown, now = Date.now()): FlagSnapshot {
  const snapshot = value as FlagSnapshot;
  if (
    !snapshot ||
    !snapshot.flags ||
    !Number.isFinite(snapshot.validUntil) ||
    snapshot.validUntil <= now ||
    snapshot.validUntil > now + FLAG_MAX_STALE_MS ||
    !["database", "last-known-good", "closed"].includes(snapshot.source) ||
    FEATURES.some((key) => typeof snapshot.flags[key] !== "boolean")
  ) {
    throw new Error("Invalid feature flag snapshot");
  }
  const flags = closedFlags();
  for (const key of FEATURES)
    flags[key] = snapshot.flags[key] && FEATURE_REGISTRY[key].available;
  return { flags, validUntil: snapshot.validUntil, source: snapshot.source };
}

/** Reads every time. The retained value is used only after a failed read. */
export function createFlagReader(
  load: () => Promise<FlagSnapshot>,
  now = Date.now,
) {
  let lastGood: FlagSnapshot | undefined;
  return async (): Promise<FlagSnapshot> => {
    try {
      const snapshot = parseFlagSnapshot(await load(), now());
      if (snapshot.source !== "closed") lastGood = snapshot;
      return snapshot;
    } catch {
      if (lastGood && now() < lastGood.validUntil) {
        return { ...lastGood, source: "last-known-good" };
      }
      return { flags: closedFlags(), validUntil: now(), source: "closed" };
    }
  };
}

export function disabledFeature(
  flags: FeatureFlags,
  required: readonly Feature[],
) {
  return required.find(
    (key) => !FEATURE_REGISTRY[key].available || !flags[key],
  );
}
