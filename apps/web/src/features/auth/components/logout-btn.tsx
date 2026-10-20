"use client";

import { useState } from "react";
import { toast } from "sonner";
import { authFailureMessage } from "@/client/errors";
import { signOut } from "@/features/auth/client";
import { Button } from "@/components/ui/button";

export function LogoutBtn() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const result = await signOut();
          if (result.error) toast.error(authFailureMessage(result.error));
        } catch (error) {
          toast.error(authFailureMessage(error));
        } finally {
          setPending(false);
        }
      }}
      className="w-full"
    >
      Log out
    </Button>
  );
}
