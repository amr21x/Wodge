"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  Feature,
  FeatureFlags,
  FLAG_REFRESH_MS,
  FLAG_REQUEST_TIMEOUT_MS,
} from "@wodge/domain/features/models";
import {
  closedFlags,
  createFlagReader,
  disabledFeature,
} from "@wodge/core/features/flags";
import { pageFeatures } from "@wodge/core/features/policy";

const FeatureFlagsContext = createContext<FeatureFlags>(closedFlags());

export function FeatureFlagsProvider({ children }: { children: ReactNode }) {
  const [flags, setFlags] = useState(closedFlags);
  useEffect(() => {
    let disposed = false;
    let refreshing = false;
    let expiry: ReturnType<typeof setTimeout> | undefined;
    const read = createFlagReader(async () => {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        FLAG_REQUEST_TIMEOUT_MS,
      );
      try {
        const response = await fetch("/api/feature-flags", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Flags unavailable");
        return await response.json();
      } finally {
        clearTimeout(timer);
      }
    });
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const snapshot = await read();
        if (disposed) return;
        setFlags(snapshot.flags);
        clearTimeout(expiry);
        expiry = setTimeout(
          () => setFlags(closedFlags()),
          Math.max(0, snapshot.validUntil - Date.now()),
        );
      } finally {
        refreshing = false;
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), FLAG_REFRESH_MS);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      disposed = true;
      clearInterval(interval);
      clearTimeout(expiry);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return (
    <FeatureFlagsContext.Provider value={flags}>
      {children}
    </FeatureFlagsContext.Provider>
  );
}

export function useFeatureFlags() {
  return useContext(FeatureFlagsContext);
}

export function FeatureGate({
  feature,
  children,
}: {
  feature: Feature;
  children: ReactNode;
}) {
  const flags = useFeatureFlags();
  return flags[feature] ? <>{children}</> : null;
}

export function FeatureRouteGate({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  const flags = useFeatureFlags();
  const mountedPath = useRef<string>();
  const disabled = disabledFeature(flags, pageFeatures(path));
  if (!disabled) mountedPath.current = path;
  // Hide an already-open feature without tearing down its session or editor state.
  // A direct visit to a disabled route does not mount that feature in the first place.
  const keepMounted = !disabled || mountedPath.current === path;
  return (
    <>
      {disabled && (
        <main className="flex h-dvh flex-col items-center justify-center gap-4">
          <output>This feature is currently unavailable.</output>
          <Link href="/">Back to workspaces</Link>
        </main>
      )}
      <div
        className={disabled ? "hidden" : "contents"}
        aria-hidden={disabled ? true : undefined}
      >
        {keepMounted ? children : null}
      </div>
    </>
  );
}
