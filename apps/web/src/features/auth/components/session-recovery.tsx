"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@wodge/auth/client";
import { queryClient } from "@/client/query";
import { useAppStore } from "@/client/state/store";
import { accessFailureEvent } from "@/client/errors";
import { syncStatusEvent } from "@/client/sync/transport";
import { refreshPermissions } from "@/client/permissions";
import { loginPath } from "@/features/auth/redirect";

export function SessionRecovery() {
  const { data: session, isPending } = authClient.useSession();
  const previousIdentity = useRef<string | null | undefined>(undefined);
  const [sessionLost, setSessionLost] = useState(false);
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    if (isPending) return;
    const identity = session
      ? `${session.user.id}:${session.session?.id ?? ""}`
      : null;
    const previous = previousIdentity.current;
    previousIdentity.current = identity;
    if (previous !== undefined && previous !== identity) {
      void queryClient.cancelQueries();
      queryClient.clear();
      void useAppStore.getState().actions.reset();
      setSessionLost(!identity);
      setSyncErrors({});
    }
    if (identity) setSessionLost(false);
  }, [session, isPending]);

  useEffect(() => {
    const onAccessFailure = (event: Event) => {
      refreshPermissions({ refetch: false, revoke: true });
      if (event instanceof CustomEvent && event.detail === 401) {
        setSessionLost(true);
        // Invalidate Better Auth's session, not just the application profile query.
        void authClient.getSession({ query: { disableCookieCache: true } });
        authClient.$store.notify("$sessionSignal");
      }
    };
    const onSyncStatus = (event: Event) => {
      if (!(event instanceof CustomEvent)) return;
      const detail: unknown = event.detail;
      if (
        !detail ||
        typeof detail !== "object" ||
        !("key" in detail) ||
        typeof detail.key !== "string" ||
        !("message" in detail)
      )
        return;
      const { key, message } = detail;
      setSyncErrors((previous) => {
        const next = { ...previous };
        if (typeof message === "string") next[key] = message;
        else delete next[key];
        return next;
      });
    };
    window.addEventListener(syncStatusEvent, onSyncStatus);
    const onOffline = () => {
      setOffline(true);
      refreshPermissions();
    };
    const onOnline = () => {
      setOffline(false);
      refreshPermissions();
    };
    window.addEventListener(accessFailureEvent, onAccessFailure);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener(syncStatusEvent, onSyncStatus);
      window.removeEventListener(accessFailureEvent, onAccessFailure);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const syncError = Object.values(syncErrors)[0];
  if (!sessionLost && !offline && !syncError) return null;
  return (
    <output className="fixed bottom-4 left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-md border bg-background p-4 text-sm shadow">
      {sessionLost ? (
        <>
          <span>
            Your session has expired. Pending edits have not been
            confirmed.{" "}
          </span>
          {/* Rendered only on the client after a session loss, so location is available. */}
          <Link
            className="underline"
            href={loginPath(window.location.pathname + window.location.search)}
          >
            Sign in again
          </Link>
        </>
      ) : offline ? (
        "You are offline. Pending edits have not been confirmed by the server. Reconnect to synchronize."
      ) : (
        syncError
      )}
    </output>
  );
}
