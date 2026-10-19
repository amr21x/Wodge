"use client";

import { RiGoogleFill as Google } from "react-icons/ri";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { authClient } from "@/features/auth/client";
import { useSearchParams } from "next/navigation";
import { env } from "@wodge/env/client";

export function OAuth() {
  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect");

  async function onClick(provider: "google" | "github") {
    const next =
      redirect?.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";

    await authClient.signIn.social({ provider, callbackURL: next });
  }

  return (
    <div className="flex space-x-3">
      <Button
        variant="outline"
        className="w-full bg-background transition-all hover:bg-[#0057e7] hover:text-white"
        onClick={() => onClick("google")}
      >
        <Google className="h-5 w-5" />
        {/* Continue with Google */}
      </Button>
      <Button
        variant="outline"
        className="w-full bg-background text-[#24292e] transition-all hover:bg-[#24292e] hover:text-[#fafbfc] dark:text-[#fafbfc] dark:hover:bg-[#fafbfc] dark:hover:text-[#24292e]"
        onClick={() => onClick("github")}
      >
        <GitHubLogoIcon className="h-5 w-5" />
        {/* Continue with GitHub */}
      </Button>
    </div>
  );
}
