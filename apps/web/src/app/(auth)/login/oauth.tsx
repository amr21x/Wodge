"use client";

import { RiGoogleFill as Google } from "react-icons/ri";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams } from "next/navigation";
import { env } from "@wodge/env";

export function OAuth() {
  const supabase = createClient();

  const searchParams = useSearchParams();

  const redirect = searchParams.get("redirect");

  async function onClick(provider: "google" | "github") {
    await supabase.auth.signInWithOAuth({
      provider,

      options: {
        redirectTo: `${env.NEXT_PUBLIC_APP_DOMAIN}/auth/callback?next=${redirect || "/"}`,
      },
    });
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
