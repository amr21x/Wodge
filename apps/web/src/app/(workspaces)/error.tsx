"use client";

import { RecoveryScreen } from "@/components/recovery-screen";

export default function WorkspaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RecoveryScreen reset={reset} />;
}
