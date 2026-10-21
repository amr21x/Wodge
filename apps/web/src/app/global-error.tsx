"use client";

import { RecoveryScreen } from "@/components/recovery-screen";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <RecoveryScreen reset={reset} />
      </body>
    </html>
  );
}
