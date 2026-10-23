"use client";

import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function Component() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const [countdown, setCountdown] = useState(5);
  useState(false);

  useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (countdown <= 0) {
      return;
    }

    const interval = setInterval(() => {
      setCountdown(countdown - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown]);

  const queryClient = useQueryClient();

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-md text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
          <CircleCheckIcon className="h-10 w-10 text-green-500 dark:text-green-400" />
        </div>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Checkout Complete
        </h1>
        <p className="mt-4 text-muted-foreground">
          Thank you. Your upgrade is being confirmed and Pro features become
          available as soon as the payment is verified.
        </p>
        <div className="mt-6">
          <Button
            size="sm"
            disabled={countdown > 0}
            onClick={() => {
              queryClient.invalidateQueries({
                queryKey: ["user-workspaces"],
              });

              router.push(`/${workspaceSlug}/settings/upgrade`);
            }}
          >
            {countdown === 0
              ? "Back to workspace"
              : `Redirecting in ${countdown} seconds`}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CircleCheckIcon(
  props: React.SVGProps<SVGSVGElement> & { className?: string },
) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
