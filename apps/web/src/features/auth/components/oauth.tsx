"use client";

import { RiGoogleFill as Google } from "react-icons/ri";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/client";
import { useState } from "react";
import { toast } from "sonner";
import { authFailureMessage } from "@/client/errors";
import { safeRedirect } from "../redirect";
import { useSearchParams } from "next/navigation";

export function OAuth() {
  const [pending, setPending] = useState(false);
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect");

  async function onClick(provider: "google" | "github") {
    if (pending) return;
    setPending(true);
    try {
      const { error } = await authClient.signIn.social({
        provider,
        callbackURL: safeRedirect(redirect),
      });
      if (error) toast.error(authFailureMessage(error));
    } catch (error) {
      toast.error(authFailureMessage(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex space-x-3">
      <Button
        disabled={pending}
        variant="outline"
        className="w-full bg-background transition-all hover:bg-[#0057e7] hover:text-white"
        aria-label="Continue with Google"
        onClick={() => onClick("google")}
      >
        <Google className="h-5 w-5" />
        {/* Continue with Google */}
      </Button>
      <Button
        disabled={pending}
        variant="outline"
        className="w-full bg-background text-[#24292e] transition-all hover:bg-[#24292e] hover:text-[#fafbfc] dark:text-[#fafbfc] dark:hover:bg-[#fafbfc] dark:hover:text-[#24292e]"
        aria-label="Continue with GitHub"
        onClick={() => onClick("github")}
      >
        <GitHubLogoIcon className="h-5 w-5" />
        {/* Continue with GitHub */}
      </Button>
    </div>
  );
}
