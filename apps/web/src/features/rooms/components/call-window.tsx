"use client";

import { Button } from "@/components/ui/button";
import { isCallWindowOpenAtom } from "@/client/state/global-atoms";
import { useAtom } from "jotai";

export function CallWindow() {
  const [open, setOpen] = useAtom(isCallWindowOpenAtom);
  if (!open) return null;

  return (
    /* oxlint-disable jsx-a11y/prefer-tag-over-role -- The unavailable-call notice is nonmodal; a native dialog would alter its display and focus behavior. */
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="calls-disabled-title"
      className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border bg-background p-4 shadow-lg"
    >
      <h2 id="calls-disabled-title" className="font-semibold">
        Calls are unavailable
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Calls are disabled in this showcase. Room messaging remains available.
      </p>
      <Button
        className="mt-3"
        variant="secondary"
        onClick={() => setOpen(false)}
      >
        Close
      </Button>
    </div>
    /* oxlint-enable jsx-a11y/prefer-tag-over-role */
  );
}
