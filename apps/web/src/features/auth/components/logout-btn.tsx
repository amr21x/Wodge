"use client";

import { signOut } from "@/features/auth/client";
import { Button } from "@/components/ui/button";

export function LogoutBtn() {
  return (
    <Button onClick={async () => await signOut()} className="w-full">
      Log out
    </Button>
  );
}
